import { generateError, generateSuccess } from '../../helpers/graph.mjs'
import { isNil } from 'lodash-es'

export default {
  Query: {
    async navigationById (obj, args, context, info) {
      return WIKI.db.navigation.getNav({ id: args.id, cache: true, userGroups: context.req.user?.groups })
    }
  },
  Mutation: {
    async updateNavigation (obj, args, context) {
      try {
        // -> Require admin permissions
        const userPermissions = context.req.user?.permissions || []
        if (!userPermissions.includes('manage:system') && !userPermissions.includes('manage:navigation')) {
          throw new Error('You do not have permission to manage navigation.')
        }

        let updateInherited = false
        let updateInheritedNavId = null
        let updateNavId = null
        let ancestorNavId = null

        let treeEntry = await WIKI.db.knex('tree').where('id', args.pageId).first()
        if (!treeEntry) {
          // -> Fallback: look up in pages table (v2 migration scenario where tree is empty)
          const page = await WIKI.db.knex('pages').where('id', args.pageId).first()
          if (!page) {
            throw new Error('Invalid ID')
          }
          // -> Get the site ID
          const site = page.siteId || (await WIKI.db.knex('sites').first())?.id
          // -> Construct a virtual tree entry from the page
          const pathParts = (page.path || '').split('/')
          const fileName = pathParts.pop() || 'home'
          const folderPath = pathParts.join('.')
          treeEntry = {
            id: page.id,
            folderPath,
            fileName,
            siteId: site,
            navigationMode: 'inherit',
            navigationId: null
          }
        }
        const currentNavId = treeEntry.folderPath === '' && treeEntry.fileName === 'home' ? treeEntry.siteId : treeEntry.id
        const treeEntryPath = treeEntry.folderPath ? `${treeEntry.folderPath}.${treeEntry.fileName}` : treeEntry.fileName

        // -> Create / Update Nav Menu Items
        if (!isNil(args.items)) {
          await WIKI.db.knex('navigation').insert({
            id: currentNavId,
            items: JSON.stringify(args.items),
            siteId: treeEntry.siteId
          }).onConflict('id').merge({
            items: JSON.stringify(args.items)
          })
        }

        // -> Find ancestor nav ID
        const ancNavResult = await WIKI.db.knex.raw(`
          SELECT "navigationId", "navigationMode", nlevel("folderPath" || "fileName") AS levels
          FROM tree
          WHERE ("folderPath" || "fileName") @> :currentPath
            AND "navigationMode" IN ('override', 'hide')
          ORDER BY levels DESC
          LIMIT 1
        `, {
          currentPath: treeEntry.folderPath
        })
        if (ancNavResult.rowCount > 0) {
          ancestorNavId = ancNavResult.rows[0]?.navigationId
        } else {
          ancestorNavId = treeEntry.siteId
        }

        // -> Update mode
        switch (args.mode) {
          case 'inherit': {
            updateNavId = ancestorNavId
            if (['override', 'hide'].includes(treeEntry.navigationMode)) {
              updateInherited = true
              updateInheritedNavId = ancestorNavId
            }
            break
          }
          case 'override': {
            updateNavId = treeEntry.id
            updateInherited = true
            updateInheritedNavId = treeEntry.id
            break
          }
          case 'overrideExact': {
            updateNavId = treeEntry.id
            if (['override', 'hide'].includes(treeEntry.navigationMode)) {
              updateInherited = true
              updateInheritedNavId = ancestorNavId
            }
            break
          }
          case 'hide': {
            updateInherited = true
            updateNavId = null
            break
          }
          case 'hideExact': {
            updateNavId = null
            if (['override', 'hide'].includes(treeEntry.navigationMode)) {
              updateInherited = true
              updateInheritedNavId = ancestorNavId
            }
            break
          }
        }

        // -> Set for current path
        await WIKI.db.knex('tree').where('id', treeEntry.id).update({ navigationMode: args.mode, navigationId: updateNavId })

        // -> Update nodes that inherit from current
        if (updateInherited) {
          await WIKI.db.knex.raw(`
            UPDATE tree tt
            SET "navigationId" = :navId
            WHERE type IN ('page', 'folder')
              AND "folderPath" <@ :overridePath
              AND "navigationMode" = 'inherit'
              AND NOT EXISTS (
                SELECT 1
                FROM tree tc
                WHERE type IN ('page', 'folder')
                  AND tc."folderPath" <@ :overridePath
                  AND tc."folderPath" @> tt."folderPath"
                  AND tc."navigationMode" IN ('override', 'hide')
              )
          `, {
            navId: updateInheritedNavId,
            overridePath: treeEntryPath
          })
        }

        // for (const tree of args.tree) {
        //   await WIKI.cache.set(`nav:sidebar:${tree.locale}`, tree.items, 300)
        // }

        return {
          operation: generateSuccess('Navigation updated successfully'),
          navigationMode: args.mode,
          navigationId: updateNavId
        }
      } catch (err) {
        return generateError(err)
      }
    }
  }
}
