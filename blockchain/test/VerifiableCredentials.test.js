const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VerifiableCredentials", function () {
  let verifiableCredentials;
  let owner;
  let issuer1;
  let issuer2;
  let subject1;
  let subject2;

  beforeEach(async function () {
    // Obtener signers
    [owner, issuer1, issuer2, subject1, subject2] = await ethers.getSigners();

    // Deploy contract
    const VerifiableCredentials = await ethers.getContractFactory("VerifiableCredentials");
    verifiableCredentials = await VerifiableCredentials.deploy();
    await verifiableCredentials.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await verifiableCredentials.owner()).to.equal(owner.address);
    });

    it("Should authorize the deployer as issuer", async function () {
      expect(await verifiableCredentials.isAuthorizedIssuer(owner.address)).to.be.true;
    });
  });

  describe("Issuer Management", function () {
    it("Should allow owner to add issuer", async function () {
      await verifiableCredentials.addIssuer(issuer1.address);
      expect(await verifiableCredentials.isAuthorizedIssuer(issuer1.address)).to.be.true;
    });

    it("Should allow owner to remove issuer", async function () {
      await verifiableCredentials.addIssuer(issuer1.address);
      await verifiableCredentials.removeIssuer(issuer1.address);
      expect(await verifiableCredentials.isAuthorizedIssuer(issuer1.address)).to.be.false;
    });

    it("Should not allow non-owner to add issuer", async function () {
      await expect(
        verifiableCredentials.connect(issuer1).addIssuer(issuer2.address)
      ).to.be.revertedWith("Not owner");
    });
  });

  describe("Credential Issuance", function () {
    beforeEach(async function () {
      await verifiableCredentials.addIssuer(issuer1.address);
    });

    it("Should allow authorized issuer to issue credential", async function () {
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("test metadata"));
      
      await expect(
        verifiableCredentials.connect(issuer1).issueCredential(subject1.address, metadataHash)
      ).to.emit(verifiableCredentials, "CredentialIssued");
    });

    it("Should not allow unauthorized issuer to issue credential", async function () {
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("test metadata"));
      
      await expect(
        verifiableCredentials.connect(issuer2).issueCredential(subject1.address, metadataHash)
      ).to.be.revertedWith("Issuer not authorized");
    });

    it("Should return unique credential ID", async function () {
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("test metadata"));
      
      const tx = await verifiableCredentials.connect(issuer1).issueCredential(subject1.address, metadataHash);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => {
        try {
          const parsed = verifiableCredentials.interface.parseLog(log);
          return parsed.name === 'CredentialIssued';
        } catch {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
    });
  });

  describe("Credential Verification", function () {
    let credentialId;
    let metadataHash;

    beforeEach(async function () {
      await verifiableCredentials.addIssuer(issuer1.address);
      metadataHash = ethers.keccak256(ethers.toUtf8Bytes("test metadata"));
      
      const tx = await verifiableCredentials.connect(issuer1).issueCredential(subject1.address, metadataHash);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => {
        try {
          const parsed = verifiableCredentials.interface.parseLog(log);
          return parsed.name === 'CredentialIssued';
        } catch {
          return false;
        }
      });
      
      credentialId = event.args.id;
    });

    it("Should verify credential correctly", async function () {
      const [issuer, subject, hash, revoked, issuedAt] = await verifiableCredentials.verifyCredential(credentialId);
      
      expect(issuer).to.equal(issuer1.address);
      expect(subject).to.equal(subject1.address);
      expect(hash).to.equal(metadataHash);
      expect(revoked).to.be.false;
      expect(issuedAt).to.be.gt(0);
    });

    it("Should get credential details", async function () {
      const credential = await verifiableCredentials.getCredential(credentialId);
      
      expect(credential.issuer).to.equal(issuer1.address);
      expect(credential.subject).to.equal(subject1.address);
      expect(credential.metadataHash).to.equal(metadataHash);
      expect(credential.revoked).to.be.false;
      expect(credential.issuedAt).to.be.gt(0);
    });
  });

  describe("Credential Revocation", function () {
    let credentialId;

    beforeEach(async function () {
      await verifiableCredentials.addIssuer(issuer1.address);
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("test metadata"));
      
      const tx = await verifiableCredentials.connect(issuer1).issueCredential(subject1.address, metadataHash);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => {
        try {
          const parsed = verifiableCredentials.interface.parseLog(log);
          return parsed.name === 'CredentialIssued';
        } catch {
          return false;
        }
      });
      
      credentialId = event.args.id;
    });

    it("Should allow issuer to revoke credential", async function () {
      await expect(
        verifiableCredentials.connect(issuer1).revokeCredential(credentialId)
      ).to.emit(verifiableCredentials, "CredentialRevoked");
      
      const [,,, revoked] = await verifiableCredentials.verifyCredential(credentialId);
      expect(revoked).to.be.true;
    });

    it("Should not allow non-issuer to revoke credential", async function () {
      await expect(
        verifiableCredentials.connect(issuer2).revokeCredential(credentialId)
      ).to.be.revertedWith("Not credential issuer");
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer ownership", async function () {
      await verifiableCredentials.transferOwnership(issuer1.address);
      expect(await verifiableCredentials.owner()).to.equal(issuer1.address);
    });

    it("Should not allow non-owner to transfer ownership", async function () {
      await expect(
        verifiableCredentials.connect(issuer1).transferOwnership(issuer2.address)
      ).to.be.revertedWith("Not owner");
    });

    it("Should not allow transfer to zero address", async function () {
      await expect(
        verifiableCredentials.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("New owner cannot be zero address");
    });
  });
});
