#!/usr/bin/env node

/**
 * CATE Verifiable Credentials System Test Script
 * 
 * This script tests the complete system:
 * 1. Health check
 * 2. Database connection
 * 3. Blockchain connection
 * 4. API endpoints
 * 5. KYC flow
 */

import fetch from 'node-fetch';
import { config } from './config/env.js';
import { checkContractHealth } from './blockchain/contract.js';
import { testConnection, healthCheck } from './db/index.js';

const API_BASE = `http://localhost:${config.server.port}`;

console.log('🧪 Testing CATE Verifiable Credentials System...\n');

async function testHealthCheck() {
  console.log('1️⃣ Testing Health Check...');
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    
    if (data.status === 'ok') {
      console.log('✅ Health check passed');
      console.log(`   Database: ${data.database.status}`);
      console.log(`   Blockchain: ${data.blockchain.status}`);
      return true;
    } else {
      console.log('❌ Health check failed:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n2️⃣ Testing Database Connection...');
  try {
    const connected = await testConnection();
    if (connected) {
      console.log('✅ Database connection successful');
      
      const health = await healthCheck();
      console.log(`   Tables: ${health.tables.join(', ')}`);
      return true;
    } else {
      console.log('❌ Database connection failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Database error:', error.message);
    return false;
  }
}

async function testBlockchainConnection() {
  console.log('\n3️⃣ Testing Blockchain Connection...');
  try {
    const health = await checkContractHealth();
    
    if (health.status === 'healthy') {
      console.log('✅ Blockchain connection successful');
      console.log(`   Contract: ${health.contractAddress}`);
      console.log(`   Owner: ${health.owner}`);
      console.log(`   Issuer: ${health.issuerAddress}`);
      console.log(`   Authorized: ${health.isAuthorizedIssuer}`);
      console.log(`   Network: ${health.network} (${health.chainId})`);
      return true;
    } else {
      console.log('❌ Blockchain connection failed:', health.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Blockchain error:', error.message);
    return false;
  }
}

async function testVCEndpoints() {
  console.log('\n4️⃣ Testing VC Endpoints...');
  
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';
  const testSchema = 'cate/v1/test';
  const testClaims = {
    kycLevel: 'basic',
    documentVerified: true,
    selfieMatch: true,
    testRun: true
  };
  
  try {
    // Test credential issuance
    console.log('   Testing credential issuance...');
    const issueResponse = await fetch(`${API_BASE}/api/vc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        schema: testSchema,
        claims: testClaims
      })
    });
    
    if (issueResponse.ok) {
      const issueData = await issueResponse.json();
      console.log('✅ Credential issued successfully');
      console.log(`   TX Hash: ${issueData.txHash}`);
      console.log(`   Credential ID: ${issueData.credential.onchain_id}`);
      
      // Test credential verification
      console.log('   Testing credential verification...');
      const verifyResponse = await fetch(`${API_BASE}/api/vc/${issueData.credential.onchain_id}`);
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        console.log('✅ Credential verification successful');
        console.log(`   On-chain status: ${verifyData.onchain.revoked ? 'revoked' : 'active'}`);
        console.log(`   Off-chain status: ${verifyData.offchain.status}`);
        
        return true;
      } else {
        console.log('❌ Credential verification failed');
        return false;
      }
    } else {
      console.log('❌ Credential issuance failed');
      const error = await issueResponse.text();
      console.log('   Error:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ VC endpoints error:', error.message);
    return false;
  }
}

async function testKYCFlow() {
  console.log('\n5️⃣ Testing KYC Flow...');
  
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';
  
  try {
    // Test KYC session start
    console.log('   Testing KYC session start...');
    const startResponse = await fetch(`${API_BASE}/api/kyc/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testUserId })
    });
    
    if (startResponse.ok) {
      const startData = await startResponse.json();
      console.log('✅ KYC session started successfully');
      console.log(`   Session ID: ${startData.session.id}`);
      console.log(`   Provider: ${startData.session.provider}`);
      console.log(`   Status: ${startData.session.status}`);
      
      // Test KYC webhook (simulation)
      console.log('   Testing KYC webhook simulation...');
      const webhookResponse = await fetch(`${API_BASE}/api/kyc/webhook`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-KYC-Signature': 'sha256=valid_signature'
        },
        body: JSON.stringify({
          provider_session_id: startData.session.provider_session_id,
          status: 'approved',
          result: {
            kycLevel: 'basic',
            documentVerified: true,
            selfieMatch: true,
            testRun: true
          }
        })
      });
      
      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json();
        console.log('✅ KYC webhook processed successfully');
        if (webhookData.vc) {
          console.log(`   VC issued: ${webhookData.vc.onchain_id}`);
        }
        return true;
      } else {
        console.log('❌ KYC webhook failed');
        const error = await webhookResponse.text();
        console.log('   Error:', error);
        return false;
      }
    } else {
      console.log('❌ KYC session start failed');
      const error = await startResponse.text();
      console.log('   Error:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ KYC flow error:', error.message);
    return false;
  }
}

async function runAllTests() {
  const results = {
    health: await testHealthCheck(),
    database: await testDatabaseConnection(),
    blockchain: await testBlockchainConnection(),
    vc: await testVCEndpoints(),
    kyc: await testKYCFlow()
  };
  
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log(`Health Check:     ${results.health ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Database:         ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Blockchain:       ${results.blockchain ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`VC Endpoints:     ${results.vc ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`KYC Flow:         ${results.kyc ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n🎯 Overall Result:');
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! The system is working correctly.');
    console.log('\n🚀 Ready for production use!');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure the server is running: node server.js');
    console.log('   2. Check environment variables in .env');
    console.log('   3. Verify database connection');
    console.log('   4. Confirm blockchain contract is deployed');
  }
  
  return allPassed;
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  });
}

export { runAllTests };
