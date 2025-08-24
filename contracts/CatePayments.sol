// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CatePayments {
    address public owner;
    IERC20 public stablecoin;

    event PaymentSent(address indexed from, address indexed to, uint256 amount);

    constructor(address _stablecoin) {
        owner = msg.sender;
        stablecoin = IERC20(_stablecoin);
    }

    function sendPayment(address to, uint256 amount) external {
        require(stablecoin.transferFrom(msg.sender, to, amount), "Transfer failed");
        emit PaymentSent(msg.sender, to, amount);
    }
}
