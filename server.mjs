import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import http from 'http'
import morgan from 'morgan'
import socket from 'socket.io'
import uuid from 'uuid'

import { logger } from './middleware/logger.mjs'
import JoiSchemas from './middleware/schemas.mjs'

const InactivityTimeout = 1000000

const app = express()
const server = http.Server(app)
const io = socket(server)
const port = process.env.PORT || 8000

app.use(cors())
app.use(bodyParser.json())
app.use(morgan('combined', { stream: logger.stream }))
app.set('io', io)

app.get('/get-users', async (req, res) => {
  const io = req.app.get('io')
  const sockets = Object.keys(io.sockets.sockets).map(clientId => io.sockets.connected[clientId])
  const users = sockets.filter(socket => socket.user).map(socket => socket.user)
  if (users === undefined) {
    return res.json([])
  }
  res.json(users)
})

io.on('connection', socket => {
  socket.on('user joined', user => {
    logger.info(`socket ID ${socket.id} connected with username: ${user}`)
    socket.user = user
    socket.user.latestActivity = Date.now()
    io.emit('message from server', { message: `${socket.user.user} has joined the chat`, user: 'Server', timestamp: Date.now(), id: uuid.v1() })
  })

  socket.on('message from client', message => {
    const { error } = JoiSchemas.message.validate(message)
    const valid = error == null
    if (valid && message.message.length < 10000) {
      logger.info(`Socket ID ${socket.id} (${message.user}) sent message: ${message.message}`)
      io.emit('message from server', { message: message.message, user: message.user, timestamp: Date.now(), id: uuid.v1() })
      socket.user.latestActivity = Date.now()
    } else {
      logger.error('Invalid message sent')
    }
  })

  const timeoutInterval = setInterval(() => {
    if (socket.user) {
      if (Date.now() - socket.user.latestActivity >= InactivityTimeout) {
        logger.info(`Socket ID ${socket.id} has exceeded the inactivity timeout`)
        io.emit('message from server', { message: `${socket.user.user} has exceeded the inactivity timeout of ${InactivityTimeout}ms.`, user: 'Server', timestamp: Date.now(), id: uuid.v1() })
        socket.emit('inactive')
        socket.disconnect(true)
        clearInterval(timeoutInterval)
      }
    }
  }, 5000)

  socket.on('disconnect', () => {
    if (socket.user) {
      logger.info(`Socket ID ${socket.id} has disconnected`)
      io.emit('message from server', { message: `${socket.user.user} has been disconnected.`, user: 'Server', timestamp: Date.now(), id: uuid.v1() })
    }
  })
})

server.listen(port, () => {
  console.log(`Listening on port ${port}`)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully.')
  console.log('\n SIGINT received, shutting down gracefully')
  io.emit('server shutting down')
  server.close(() => {
    process.exit(0)
  })
})

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully.')
  console.log('\n SIGTERM received, shutting down gracefully')
  io.emit('server shutting down')
  server.close(() => {
    process.exit(0)
  })
})
