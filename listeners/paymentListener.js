const { ethers } = require('ethers');
const { Pool } = require('pg');

const pool = new Pool(); // Config en .env
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const contractAddress = process.env.CATE_PAYMENTS_ADDRESS;
const abi = [
  "event PaymentSent(address indexed from, address indexed to, uint256 amount)"
];

const contract = new ethers.Contract(contractAddress, abi, provider);

function listenPayments() {
  contract.on("PaymentSent", async (from, to, amount) => {
    console.log(`Pago detectado: ${from} → ${to} : ${amount.toString()}`);

    await pool.query(
      `INSERT INTO transactions (sender, receiver, amount, tx_hash) VALUES ($1, $2, $3, $4)`,
      [from, to, amount.toString(), "on-chain"]
    );
  });
}

module.exports = { listenPayments };
