import path from 'node:path'
import { simpleGit } from 'simple-git'
import fse from 'fs-extra'
import { escape as _escape, get, includes, isEmpty, startsWith, toString } from 'lodash-es'
import stream from 'node:stream'
import { pipeline as pipelineCb } from 'node:stream'
import { promisify } from 'node:util'
import klaw from 'klaw'
import os from 'node:os'

import * as pageHelper from '../../../helpers/page.mjs'

const pipeline = promisify(pipelineCb)

export default {
  git: null,
  repoPath: '',
  async activated() {
    // not used
  },
  async deactivated() {
    // not used
  },
  /**
   * INIT
   */
  async init() {
    WIKI.logger.info('(STORAGE/GIT) Initializing...')
    this.repoPath = path.resolve(WIKI.ROOTPATH, this.config.localRepoPath)
    await fse.ensureDir(this.repoPath)
    this.git = simpleGit(this.repoPath)

    // Set custom binary path
    if (!isEmpty(this.config.gitBinaryPath)) {
      this.git.customBinary(this.config.gitBinaryPath)
    }

    // Initialize repo (if needed)
    WIKI.logger.info('(STORAGE/GIT) Checking repository state...')
    const isRepo = await this.git.checkIsRepo()
    if (!isRepo) {
      WIKI.logger.info('(STORAGE/GIT) Initializing local repository...')
      await this.git.init()
    }

    // Disable quotePath
    await this.git.raw(['config', '--local', 'core.quotepath', false])

    // Set default author
    await this.git.raw(['config', '--local', 'user.email', this.config.defaultEmail])
    await this.git.raw(['config', '--local', 'user.name', this.config.defaultName])

    // Purge existing remotes
    WIKI.logger.info('(STORAGE/GIT) Listing existing remotes...')
    const remotes = await this.git.getRemotes()
    if (remotes.length > 0) {
      WIKI.logger.info('(STORAGE/GIT) Purging existing remotes...')
      for (let remote of remotes) {
        await this.git.removeRemote(remote.name)
      }
    }

    // Add remote
    WIKI.logger.info('(STORAGE/GIT) Setting SSL Verification config...')
    await this.git.raw(['config', '--local', '--bool', 'http.sslVerify', toString(this.config.verifySSL)])
    switch (this.config.authType) {
      case 'ssh':
        WIKI.logger.info('(STORAGE/GIT) Setting SSH Command config...')
        if (this.config.sshPrivateKeyMode === 'contents') {
          try {
            this.config.sshPrivateKeyPath = path.resolve(WIKI.ROOTPATH, WIKI.config.dataPath, 'secure/git-ssh.pem')
            await fse.outputFile(this.config.sshPrivateKeyPath, this.config.sshPrivateKeyContent + os.EOL, {
              encoding: 'utf8',
              mode: 0o600
            })
          } catch (err) {
            console.error(err)
            throw err
          }
        }
        await this.git.addConfig('core.sshCommand', `ssh -i "${this.config.sshPrivateKeyPath}" -o StrictHostKeyChecking=no`)
        WIKI.logger.info('(STORAGE/GIT) Adding origin remote via SSH...')
        await this.git.addRemote('origin', this.config.repoUrl)
        break
      default:
        WIKI.logger.info('(STORAGE/GIT) Adding origin remote via HTTP/S...')
        let originUrl = ''
        if (startsWith(this.config.repoUrl, 'http')) {
          originUrl = this.config.repoUrl.replace('://', `://${encodeURI(this.config.basicUsername)}:${encodeURI(this.config.basicPassword)}@`)
        } else {
          originUrl = `https://${encodeURI(this.config.basicUsername)}:${encodeURI(this.config.basicPassword)}@${this.config.repoUrl}`
        }
        await this.git.addRemote('origin', originUrl)
        break
    }

    // Fetch updates for remote
    WIKI.logger.info('(STORAGE/GIT) Fetch updates from remote...')
    await this.git.raw(['remote', 'update', 'origin'])

    // Checkout branch
    const branches = await this.git.branch()
    if (!includes(branches.all, this.config.branch) && !includes(branches.all, `remotes/origin/${this.config.branch}`)) {
      throw new Error('Invalid branch! Make sure it exists on the remote first.')
    }
    WIKI.logger.info(`(STORAGE/GIT) Checking out branch ${this.config.branch}...`)
    await this.git.checkout(this.config.branch)

    // Perform initial sync
    await this.sync()

    WIKI.logger.info('(STORAGE/GIT) Initialization completed.')
  },
  /**
   * SYNC
   */
  async sync() {
    const currentCommitLog = get(await this.git.log(['-n', '1', this.config.branch]), 'latest', {})

    const rootUser = await WIKI.db.users.getRootUser()

    // Pull rebase
    if (includes(['sync', 'pull'], this.mode)) {
      WIKI.logger.info(`(STORAGE/GIT) Performing pull rebase from origin on branch ${this.config.branch}...`)
      await this.git.pull('origin', this.config.branch, ['--rebase'])
    }

    // Push
    if (includes(['sync', 'push'], this.mode)) {
      WIKI.logger.info(`(STORAGE/GIT) Performing push to origin on branch ${this.config.branch}...`)
      let pushOpts = ['--signed=if-asked']
      if (this.mode === 'push') {
        pushOpts.push('--force')
      }
      await this.git.push('origin', this.config.branch, pushOpts)
    }

    // Process Changes
    if (includes(['sync', 'pull'], this.mode)) {
      const latestCommitLog = get(await this.git.log(['-n', '1', this.config.branch]), 'latest', {})

      const diff = await this.git.diffSummary(['-M', currentCommitLog.hash, latestCommitLog.hash])
      if (get(diff, 'files', []).length > 0) {
        let filesToProcess = []
        for (const f of diff.files) {
          const fPath = path.join(this.repoPath, f.file)
          let fStats = { size: 0 }
          try {
            fStats = await fse.stat(fPath)
          } catch (err) {
            if (err.code !== 'ENOENT') {
              WIKI.logger.warn(`(STORAGE/GIT) Failed to access file ${f.file}! Skipping...`)
              continue
            }
          }

          filesToProcess.push({
            ...f,
            file: {
              path: fPath,
              stats: fStats
            },
            relPath: f.file
          })
        }
        await this.processFiles(filesToProcess, rootUser)
      }
    }
  },
  /**
   * Process Files
   */
  async processFiles(files, user) {
    for (const item of files) {
      const contentType = pageHelper.getContentType(item.relPath)
      const fileExists = await fse.pathExists(item.file?.path ?? item.file)
      if (!item.binary && contentType) {
        // -> Page
        if (!fileExists && item.deletions > 0 && item.insertions === 0) {
          WIKI.logger.info(`(STORAGE/GIT) Page marked as deleted: ${item.relPath}`)
          const contentPath = pageHelper.getPagePath(item.relPath)
          await WIKI.db.pages.deletePage({
            user: user,
            path: contentPath.path,
            locale: contentPath.locale,
            skipStorage: true
          })
          continue
        }

        try {
          WIKI.logger.info(`(STORAGE/GIT) Processing page ${item.relPath}...`)
          const pagePath = pageHelper.getPagePath(item.relPath)
          const filePath = item.file?.path ?? path.join(this.repoPath, item.relPath)
          const fileContent = await fse.readFile(filePath, 'utf8')
          // Simple frontmatter extraction
          let title = pagePath.path
          let description = ''
          let content = fileContent
          if (fileContent.startsWith('---')) {
            const endIdx = fileContent.indexOf('---', 3)
            if (endIdx > 0) {
              const frontmatter = fileContent.substring(3, endIdx)
              content = fileContent.substring(endIdx + 3).trim()
              const titleMatch = frontmatter.match(/title:\s*(.+)/)
              const descMatch = frontmatter.match(/description:\s*(.+)/)
              if (titleMatch) title = titleMatch[1].trim()
              if (descMatch) description = descMatch[1].trim()
            }
          }

          const existingPage = await WIKI.db.pages.query().findOne({
            path: pagePath.path,
            locale: pagePath.locale
          })
          if (existingPage) {
            await WIKI.db.pages.updatePage({
              id: existingPage.id,
              title: title || existingPage.title,
              description: description || existingPage.description,
              content,
              user,
              skipStorage: true
            })
          } else {
            await WIKI.db.pages.createPage({
              title,
              description,
              content,
              path: pagePath.path,
              locale: pagePath.locale,
              contentType: contentType,
              user,
              skipStorage: true
            })
          }
        } catch (err) {
          WIKI.logger.warn(`(STORAGE/GIT) Failed to process ${item.relPath}`)
          WIKI.logger.warn(err)
        }
      }
    }
  },
  /**
   * CREATE
   */
  async created(page) {
    WIKI.logger.info(`(STORAGE/GIT) Committing new file [${page.locale}] ${page.path}...`)
    let fileName = `${page.path}.${pageHelper.getFileExtension(page.contentType)}`
    if (WIKI.config.lang.namespacing && WIKI.config.lang.code !== page.locale) {
      fileName = `${page.locale}/${fileName}`
    }
    const filePath = path.join(this.repoPath, fileName)
    await fse.outputFile(filePath, page.injectMetadata(), 'utf8')

    const gitFilePath = `./${fileName}`
    if ((await this.git.checkIgnore(gitFilePath)).length === 0) {
      await this.git.add(gitFilePath)
      await this.git.commit(`docs: create ${page.path}`, fileName, {
        '--author': `"${page.authorName} <${page.authorEmail}>"`
      })
    }
  },
  /**
   * UPDATE
   */
  async updated(page) {
    WIKI.logger.info(`(STORAGE/GIT) Committing updated file [${page.locale}] ${page.path}...`)
    let fileName = `${page.path}.${pageHelper.getFileExtension(page.contentType)}`
    if (WIKI.config.lang.namespacing && WIKI.config.lang.code !== page.locale) {
      fileName = `${page.locale}/${fileName}`
    }
    const filePath = path.join(this.repoPath, fileName)
    await fse.outputFile(filePath, page.injectMetadata(), 'utf8')

    const gitFilePath = `./${fileName}`
    if ((await this.git.checkIgnore(gitFilePath)).length === 0) {
      await this.git.add(gitFilePath)
      await this.git.commit(`docs: update ${page.path}`, fileName, {
        '--author': `"${page.authorName} <${page.authorEmail}>"`
      })
    }
  },
  /**
   * DELETE
   */
  async deleted(page) {
    WIKI.logger.info(`(STORAGE/GIT) Committing removed file [${page.locale}] ${page.path}...`)
    let fileName = `${page.path}.${pageHelper.getFileExtension(page.contentType)}`
    if (WIKI.config.lang.namespacing && WIKI.config.lang.code !== page.locale) {
      fileName = `${page.locale}/${fileName}`
    }

    const gitFilePath = `./${fileName}`
    if ((await this.git.checkIgnore(gitFilePath)).length === 0) {
      await this.git.rm(gitFilePath)
      await this.git.commit(`docs: delete ${page.path}`, fileName, {
        '--author': `"${page.authorName} <${page.authorEmail}>"`
      })
    }
  },
  /**
   * RENAME
   */
  async renamed(page) {
    WIKI.logger.info(`(STORAGE/GIT) Committing file move from [${page.locale}] ${page.path} to [${page.destinationLocale}] ${page.destinationPath}...`)
    let sourceFileName = `${page.path}.${pageHelper.getFileExtension(page.contentType)}`
    let destinationFileName = `${page.destinationPath}.${pageHelper.getFileExtension(page.contentType)}`

    if (WIKI.config.lang.namespacing) {
      if (WIKI.config.lang.code !== page.locale) {
        sourceFileName = `${page.locale}/${sourceFileName}`
      }
      if (WIKI.config.lang.code !== page.destinationLocale) {
        destinationFileName = `${page.destinationLocale}/${destinationFileName}`
      }
    }

    const sourceFilePath = path.join(this.repoPath, sourceFileName)
    const destinationFilePath = path.join(this.repoPath, destinationFileName)
    await fse.move(sourceFilePath, destinationFilePath)

    await this.git.rm(`./${sourceFileName}`)
    await this.git.add(`./${destinationFileName}`)
    await this.git.commit(`docs: rename ${page.path} to ${page.destinationPath}`, [sourceFilePath, destinationFilePath], {
      '--author': `"${page.moveAuthorName} <${page.moveAuthorEmail}>"`
    })
  },
  /**
   * ASSET UPLOAD
   */
  async assetUploaded (asset) {
    WIKI.logger.info(`(STORAGE/GIT) Committing new file ${asset.path}...`)
    const filePath = path.join(this.repoPath, asset.path)
    await fse.outputFile(filePath, asset.data, 'utf8')

    await this.git.add(`./${asset.path}`)
    await this.git.commit(`docs: upload ${asset.path}`, asset.path, {
      '--author': `"${asset.authorName} <${asset.authorEmail}>"`
    })
  },
  /**
   * ASSET DELETE
   */
  async assetDeleted (asset) {
    WIKI.logger.info(`(STORAGE/GIT) Committing removed file ${asset.path}...`)

    await this.git.rm(`./${asset.path}`)
    await this.git.commit(`docs: delete ${asset.path}`, asset.path, {
      '--author': `"${asset.authorName} <${asset.authorEmail}>"`
    })
  },
  /**
   * ASSET RENAME
   */
  async assetRenamed (asset) {
    WIKI.logger.info(`(STORAGE/GIT) Committing file move from ${asset.path} to ${asset.destinationPath}...`)

    await this.git.mv(`./${asset.path}`, `./${asset.destinationPath}`)
    await this.git.commit(`docs: rename ${asset.path} to ${asset.destinationPath}`, [asset.path, asset.destinationPath], {
      '--author': `"${asset.moveAuthorName} <${asset.moveAuthorEmail}>"`
    })
  },
  async getLocalLocation (asset) {
    return path.join(this.repoPath, asset.path)
  },
  /**
   * HANDLERS
   */
  async importAll() {
    WIKI.logger.info(`(STORAGE/GIT) Importing all content from local Git repo to the DB...`)

    const rootUser = await WIKI.db.users.getRootUser()

    await pipeline(
      klaw(this.repoPath, {
        filter: (f) => {
          return !f.includes('.git')
        }
      }),
      new stream.Transform({
        objectMode: true,
        transform: async (file, enc, cb) => {
          const relPath = file.path.substr(this.repoPath.length + 1)
          if (file.stats.size < 1) {
            return cb()
          } else if (relPath && relPath.length > 3) {
            WIKI.logger.info(`(STORAGE/GIT) Processing ${relPath}...`)
            await this.processFiles([{
              user: rootUser,
              relPath,
              file,
              deletions: 0,
              insertions: 0
            }], rootUser)
          }
          cb()
        }
      })
    )

    WIKI.logger.info('(STORAGE/GIT) Import completed.')
  },
  async syncUntracked() {
    WIKI.logger.info(`(STORAGE/GIT) Adding all untracked content...`)

    // -> Pages
    await pipeline(
      WIKI.db.knex.column('path', 'locale', 'title', 'description', 'contentType', 'content', 'publishState', 'updatedAt', 'createdAt').select().from('pages').where({
        publishState: 'published'
      }).stream(),
      new stream.Transform({
        objectMode: true,
        transform: async (page, enc, cb) => {
          let fileName = `${page.path}.${pageHelper.getFileExtension(page.contentType)}`
          if (WIKI.config.lang.namespacing && WIKI.config.lang.code !== page.locale) {
            fileName = `${page.locale}/${fileName}`
          }
          WIKI.logger.info(`(STORAGE/GIT) Adding page ${fileName}...`)
          const filePath = path.join(this.repoPath, fileName)
          await fse.outputFile(filePath, pageHelper.injectPageMetadata(page), 'utf8')
          await this.git.add(`./${fileName}`)
          cb()
        }
      })
    )

    await this.git.commit(`docs: add all untracked content`)
    WIKI.logger.info('(STORAGE/GIT) All content is now tracked.')
  },
  async purge() {
    WIKI.logger.info(`(STORAGE/GIT) Purging local repository...`)
    await fse.emptyDir(this.repoPath)
    WIKI.logger.info('(STORAGE/GIT) Local repository is now empty. Reinitializing...')
    await this.init()
  }
}
