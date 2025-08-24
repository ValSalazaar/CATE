// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VerifiableCredentials {
    struct Credential {
        address issuer;
        address subject;
        bytes32 metadataHash; // Hash de metadatos (off-chain cifrados en DB)
        bool revoked;
        uint256 issuedAt;
    }

    address public owner;
    mapping(address => bool) public authorizedIssuers;
    mapping(bytes32 => Credential) private credentials;

    event IssuerAdded(address indexed account);
    event IssuerRemoved(address indexed account);
    event CredentialIssued(bytes32 indexed id, address indexed issuer, address indexed subject, bytes32 metadataHash);
    event CredentialRevoked(bytes32 indexed id, address indexed issuer);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Issuer not authorized");
        _;
    }

    modifier onlyIssuerOf(bytes32 _id) {
        require(credentials[_id].issuer == msg.sender, "Not credential issuer");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedIssuers[msg.sender] = true;
        emit IssuerAdded(msg.sender);
    }

    function addIssuer(address account) external onlyOwner {
        authorizedIssuers[account] = true;
        emit IssuerAdded(account);
    }

    function removeIssuer(address account) external onlyOwner {
        authorizedIssuers[account] = false;
        emit IssuerRemoved(account);
    }

    function issueCredential(
        address _subject,
        bytes32 _metadataHash
    ) external onlyAuthorizedIssuer returns (bytes32) {
        bytes32 id = keccak256(abi.encodePacked(msg.sender, _subject, _metadataHash, block.timestamp));
        credentials[id] = Credential({
            issuer: msg.sender,
            subject: _subject,
            metadataHash: _metadataHash,
            revoked: false,
            issuedAt: block.timestamp
        });
        emit CredentialIssued(id, msg.sender, _subject, _metadataHash);
        return id;
    }

    function revokeCredential(bytes32 _id) external onlyIssuerOf(_id) {
        credentials[_id].revoked = true;
        emit CredentialRevoked(_id, msg.sender);
    }

    function verifyCredential(bytes32 _id) external view returns (
        address issuer,
        address subject,
        bytes32 metadataHash,
        bool revoked,
        uint256 issuedAt
    ) {
        Credential memory cred = credentials[_id];
        return (cred.issuer, cred.subject, cred.metadataHash, cred.revoked, cred.issuedAt);
    }

    function getCredential(bytes32 _id) external view returns (Credential memory) {
        Credential memory cred = credentials[_id];
        require(cred.issuer != address(0), "Credential does not exist");
        return cred;
    }

    function isAuthorizedIssuer(address _issuer) external view returns (bool) {
        return authorizedIssuers[_issuer];
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}
