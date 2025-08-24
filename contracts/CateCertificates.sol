// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title CateCertificates
 * @dev Smart contract for registering and verifying certificates on blockchain
 * @author CATE Team
 */
contract CateCertificates is Ownable, ReentrancyGuard {
    
    // Events
    event CertificateRegistered(
        bytes32 indexed certHash,
        address indexed issuer,
        uint256 timestamp,
        string metadata
    );
    
    event IssuerAdded(address indexed issuer, string name, uint256 timestamp);
    event IssuerRemoved(address indexed issuer, uint256 timestamp);
    
    // Structs
    struct Certificate {
        bytes32 hash;
        address issuer;
        uint256 timestamp;
        bool exists;
    }
    
    struct Issuer {
        string name;
        bool isActive;
        uint256 addedAt;
    }
    
    // State variables
    mapping(bytes32 => Certificate) public certificates;
    mapping(address => Issuer) public issuers;
    mapping(address => bool) public authorizedIssuers;
    
    uint256 public totalCertificates;
    uint256 public totalIssuers;
    
    // Modifiers
    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "CateCertificates: Only authorized issuers can register certificates");
        _;
    }
    
    modifier certificateNotExists(bytes32 certHash) {
        require(!certificates[certHash].exists, "CateCertificates: Certificate already registered");
        _;
    }
    
    // Constructor
    constructor() Ownable(msg.sender) {
        // Add contract deployer as first issuer
        _addIssuer(msg.sender, "CATE System");
    }
    
    /**
     * @dev Register a new certificate hash
     * @param certHash The SHA-256 hash of the certificate
     * @param metadata Optional metadata about the certificate
     */
    function registerCertificate(
        bytes32 certHash, 
        string memory metadata
    ) 
        external 
        onlyAuthorizedIssuer 
        certificateNotExists(certHash)
        nonReentrant
    {
        require(certHash != bytes32(0), "CateCertificates: Invalid certificate hash");
        
        certificates[certHash] = Certificate({
            hash: certHash,
            issuer: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });
        
        totalCertificates++;
        
        emit CertificateRegistered(certHash, msg.sender, block.timestamp, metadata);
    }
    
    /**
     * @dev Verify if a certificate hash is registered
     * @param certHash The certificate hash to verify
     * @return isValid Whether the certificate is valid
     * @return issuer The address of the issuer
     * @return timestamp When the certificate was registered
     */
    function verifyCertificate(bytes32 certHash) 
        external 
        view 
        returns (bool isValid, address issuer, uint256 timestamp) 
    {
        Certificate memory cert = certificates[certHash];
        
        if (!cert.exists) {
            return (false, address(0), 0);
        }
        
        // Check if issuer is still authorized
        if (!authorizedIssuers[cert.issuer]) {
            return (false, cert.issuer, cert.timestamp);
        }
        
        return (true, cert.issuer, cert.timestamp);
    }
    
    /**
     * @dev Get certificate details
     * @param certHash The certificate hash
     * @return Certificate struct with all details
     */
    function getCertificate(bytes32 certHash) 
        external 
        view 
        returns (Certificate memory) 
    {
        return certificates[certHash];
    }
    
    /**
     * @dev Check if an address is an authorized issuer
     * @param issuer The address to check
     * @return Whether the address is an authorized issuer
     */
    function isAuthorizedIssuer(address issuer) external view returns (bool) {
        return authorizedIssuers[issuer];
    }
    
    /**
     * @dev Add a new authorized issuer (only owner)
     * @param issuer The address of the new issuer
     * @param name The name of the issuer
     */
    function addIssuer(address issuer, string memory name) external onlyOwner {
        require(issuer != address(0), "CateCertificates: Invalid issuer address");
        require(!authorizedIssuers[issuer], "CateCertificates: Issuer already exists");
        
        _addIssuer(issuer, name);
    }
    
    /**
     * @dev Remove an authorized issuer (only owner)
     * @param issuer The address of the issuer to remove
     */
    function removeIssuer(address issuer) external onlyOwner {
        require(authorizedIssuers[issuer], "CateCertificates: Issuer does not exist");
        
        authorizedIssuers[issuer] = false;
        issuers[issuer].isActive = false;
        totalIssuers--;
        
        emit IssuerRemoved(issuer, block.timestamp);
    }
    
    /**
     * @dev Update issuer name (only owner)
     * @param issuer The address of the issuer
     * @param newName The new name
     */
    function updateIssuerName(address issuer, string memory newName) external onlyOwner {
        require(authorizedIssuers[issuer], "CateCertificates: Issuer does not exist");
        require(bytes(newName).length > 0, "CateCertificates: Name cannot be empty");
        
        issuers[issuer].name = newName;
    }
    
    /**
     * @dev Get issuer details
     * @param issuer The address of the issuer
     * @return Issuer struct with all details
     */
    function getIssuer(address issuer) external view returns (Issuer memory) {
        return issuers[issuer];
    }
    
    /**
     * @dev Get contract statistics
     * @return Total number of certificates and issuers
     */
    function getStats() external view returns (uint256, uint256) {
        return (totalCertificates, totalIssuers);
    }
    
    /**
     * @dev Batch verify multiple certificates
     * @param certHashes Array of certificate hashes to verify
     * @return Array of verification results
     */
    function batchVerifyCertificates(bytes32[] memory certHashes) 
        external 
        view 
        returns (bool[] memory results, address[] memory issuers, uint256[] memory timestamps) 
    {
        results = new bool[](certHashes.length);
        issuers = new address[](certHashes.length);
        timestamps = new uint256[](certHashes.length);
        
        for (uint256 i = 0; i < certHashes.length; i++) {
            (results[i], issuers[i], timestamps[i]) = this.verifyCertificate(certHashes[i]);
        }
    }
    
    /**
     * @dev Internal function to add an issuer
     * @param issuer The address of the issuer
     * @param name The name of the issuer
     */
    function _addIssuer(address issuer, string memory name) internal {
        authorizedIssuers[issuer] = true;
        issuers[issuer] = Issuer({
            name: name,
            isActive: true,
            addedAt: block.timestamp
        });
        totalIssuers++;
        
        emit IssuerAdded(issuer, name, block.timestamp);
    }
    
    /**
     * @dev Emergency function to pause certificate registration (only owner)
     * @param pause Whether to pause or unpause
     */
    function emergencyPause(bool pause) external onlyOwner {
        // This could be implemented with a pause mechanism
        // For now, we'll use a simple approach
        if (pause) {
            // Pause logic would go here
        }
    }
}
