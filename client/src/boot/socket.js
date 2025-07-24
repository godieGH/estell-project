// src/boot/socketio.js

import { boot } from 'quasar/wrappers'
import { io } from 'socket.io-client'

// Define the socket instance outside the boot function so it can be exported
let socket = null

export default boot(({ app }) => {
  // Retrieve the Socket.IO URL from your environment variables
  const SOCKET_URL = "/"
  
  //console.log(SOCKET_URL)
  // Initialize the socket connection
  socket = io(SOCKET_URL, {
    // You can add additional options here, e.g.,
    // transports: ['websocket'],
    // autoConnect: false,
  })

  // Set up a 'connect' event listener
  socket.on('connect', () => {
    console.log('Socket.IO connected with ID:', socket.id)
  })

  // Optional: Add other common event listeners
  socket.on('disconnect', (reason) => {
    console.log('Socket.IO disconnected:', reason)
  })

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error.message)
  })

  // Make the socket instance globally available in your Vue app
  // This allows you to access it as this.$socket in your components
  app.config.globalProperties.$socket = socket
})

// Export the socket instance so it can be imported and used directly
// in other parts of your application (e.g., store modules, other boot files)
export { socket }
