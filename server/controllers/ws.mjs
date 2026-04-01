import chalk from 'chalk'
import os from 'node:os'
import jwt from 'jsonwebtoken'

export default function () {
  WIKI.servers.ws.on('connection', async (socket) => {
    // Validate JWT token
    const token = socket.handshake.auth.token
    let user = null
    if (token) {
      try {
        const payload = jwt.verify(token, WIKI.config.auth.certs.public, { algorithms: ['RS256'] })
        user = await WIKI.db.users.getById(payload.id)
        user.permissions = user.getPermissions()
        user.groups = user.getGroups()
      } catch (err) {
        WIKI.logger.warn(`WebSocket: Invalid token - ${err.message}`)
        socket.emit('error', 'Invalid or expired token')
        socket.disconnect(true)
        return
      }
    } else {
      socket.emit('error', 'Authentication required')
      socket.disconnect(true)
      return
    }

    const listeners = {}

    socket.on('server:logs', () => {
      if (!WIKI.auth.checkAccess(user, ['manage:system'])) {
        socket.emit('error', 'Forbidden')
        socket.disconnect(true)
        return
      }
      socket.emit('server:log', chalk.greenBright(`Streaming logs from ${chalk.bold('Wiki.js')} instance ${chalk.yellowBright.bold(WIKI.INSTANCE_ID)} on host ${chalk.yellowBright.bold(os.hostname())}...`))
      listeners.serverLogs = (msg) => {
        socket.emit('server:log', msg)
      }
      WIKI.logger.ws.addListener('log', listeners.serverLogs)
      WIKI.logger.info(`User ${user.email} is streaming server logs. ( Listeners: ${WIKI.logger.ws.listenerCount('log')} )`)
    })

    socket.on('disconnect', () => {
      if (listeners.serverLogs) {
        WIKI.logger.ws.removeListener('log', listeners.serverLogs)
        delete listeners.serverLogs
      }
      if (user) {
        WIKI.logger.info(`User ${user.email} has stopped streaming server logs. ( Listeners: ${WIKI.logger.ws.listenerCount('log')} )`)
      }
    })
  })
}
