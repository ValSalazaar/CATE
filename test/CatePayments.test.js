const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CatePayments", function () {
  let CatePayments, catePayments;
  let MockToken, mockToken;
  let owner, user1, user2;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock ERC20 token
    MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock USDC", "mUSDC");
    await mockToken.waitForDeployment();

    // Deploy CatePayments contract
    CatePayments = await ethers.getContractFactory("CatePayments");
    catePayments = await CatePayments.deploy(await mockToken.getAddress());
    await catePayments.waitForDeployment();

    // Mint some tokens to users for testing
    await mockToken.mint(user1.address, ethers.parseEther("1000"));
    await mockToken.mint(user2.address, ethers.parseEther("1000"));
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await catePayments.owner()).to.equal(owner.address);
    });

    it("Should set the correct stablecoin address", async function () {
      expect(await catePayments.stablecoin()).to.equal(await mockToken.getAddress());
    });
  });

  describe("sendPayment", function () {
    const paymentAmount = ethers.parseEther("100");

    beforeEach(async function () {
      // Approve the contract to spend tokens
      await mockToken.connect(user1).approve(await catePayments.getAddress(), paymentAmount);
    });

    it("Should transfer tokens successfully", async function () {
      const user1BalanceBefore = await mockToken.balanceOf(user1.address);
      const user2BalanceBefore = await mockToken.balanceOf(user2.address);

      await catePayments.connect(user1).sendPayment(user2.address, paymentAmount);

      const user1BalanceAfter = await mockToken.balanceOf(user1.address);
      const user2BalanceAfter = await mockToken.balanceOf(user2.address);

      expect(user1BalanceAfter).to.equal(user1BalanceBefore - paymentAmount);
      expect(user2BalanceAfter).to.equal(user2BalanceBefore + paymentAmount);
    });

    it("Should emit PaymentSent event", async function () {
      await expect(catePayments.connect(user1).sendPayment(user2.address, paymentAmount))
        .to.emit(catePayments, "PaymentSent")
        .withArgs(user1.address, user2.address, paymentAmount);
    });

    it("Should fail if user doesn't have enough tokens", async function () {
      const largeAmount = ethers.parseEther("2000"); // More than user1 has
      await mockToken.connect(user1).approve(await catePayments.getAddress(), largeAmount);

      await expect(
        catePayments.connect(user1).sendPayment(user2.address, largeAmount)
      ).to.be.revertedWith("Transfer failed");
    });

    it("Should fail if user hasn't approved enough tokens", async function () {
      await expect(
        catePayments.connect(user1).sendPayment(user2.address, paymentAmount)
      ).to.be.revertedWith("Transfer failed");
    });

    it("Should fail if trying to send to zero address", async function () {
      await expect(
        catePayments.connect(user1).sendPayment(ethers.ZeroAddress, paymentAmount)
      ).to.be.revertedWith("Transfer failed");
    });
  });
});

// Mock ERC20 token for testing
const MockERC20 = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
`;
