const axios = require("axios")
require("dotenv").config()

const ETHERSCAN = "https://api.etherscan.io/v2/api"

const WHALES = [
"0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
"0x28C6c06298d514Db089934071355E5743bf21d60"
]

const THRESHOLD = Number(process.env.WHALE_THRESHOLD) || 0.000040074 

async function fetchWallet(wallet){

try{

console.log("Checking wallet:", wallet)

const res = await axios.get(ETHERSCAN,{
timeout:8000,
params:{
chainid:1,
module:"account",
action:"txlist",
address:wallet,
page:1,
offset:10,
sort:"desc",
apikey:process.env.ETHERSCAN_KEY
}
})

const txs = res?.data?.result

if(!Array.isArray(txs)){
console.log("Etherscan response error:", res.data)
return []
}

const whaleTxs = []

for(const tx of txs){

const eth = Number(tx.value) / 1e18

if(eth > THRESHOLD){

whaleTxs.push({
wallet,
amount:eth,
hash:tx.hash,
time:new Date(tx.timeStamp * 1000)
})

}

}

return whaleTxs

}catch(err){

console.log("API error for wallet:", wallet, err.message)

return []

}

}

async function getWhaleTransactions(){

try{

const results = await Promise.all(
WHALES.map(wallet => fetchWallet(wallet))
)

return results.flat()

}catch(err){

console.log("Tracker failure:", err.message)

return []

}

}

module.exports = {getWhaleTransactions}
