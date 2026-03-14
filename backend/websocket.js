const WebSocket = require("ws")
require("dotenv").config()

const ALCHEMY_KEY = process.env.ALCHEMY_KEY

function startWebSocket(){

const ws = new WebSocket(
`wss://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
)

ws.on("open", () => {

console.log("🐋 Connected to Ethereum stream")

})

ws.on("message", (data) => {

try{

const message = JSON.parse(data.toString())
console.log("New blockchain event:", message)

}catch(err){

console.log("Message parse error")

}

})

ws.on("error", (err) => {

console.log("WebSocket error:", err.message)

})

ws.on("close", () => {

console.log("Connection closed. Reconnecting in 5 seconds...")

setTimeout(startWebSocket,5000)

})

}

startWebSocket()
