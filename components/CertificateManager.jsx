import React, { useState, useRef } from 'react';
import useAuth from '../hooks/useAuth';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function CertificateManager() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('issue');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Issue certificate state
  const [certData, setCertData] = useState({
    recipient: {
      name: '',
      email: '',
      id: ''
    },
    certificate: {
      type: 'academic',
      title: '',
      description: '',
      issuedDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      grade: '',
      credits: ''
    },
    issuer: {
      name: user?.organization?.name || '',
      authority: '',
      contact: ''
    }
  });

  // Verify certificate state
  const [verificationMethod, setVerificationMethod] = useState('file');
  const [certificateFile, setCertificateFile] = useState(null);
  const [certificateHash, setCertificateHash] = useState('');
  const fileInputRef = useRef(null);

  // Handle certificate data changes
  const handleCertDataChange = (section, field, value) => {
    setCertData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Issue certificate
  const handleIssueCertificate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(
        `${API_URL}/certificates/issue`,
        {
          certData,
          metadata: {
            issuedBy: user?.email,
            organization: user?.organization?.name,
            timestamp: new Date().toISOString()
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setResult({
        type: 'success',
        message: 'Certificate issued successfully!',
        data: response.data
      });

      // Download the certificate file
      const fileBuffer = new Uint8Array(response.data.certificate);
      const blob = new Blob([fileBuffer], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${response.data.certificateId}.catecert`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to issue certificate');
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setCertificateFile(file);
    }
  };

  // Verify certificate
  const handleVerifyCertificate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response;

      if (verificationMethod === 'file' && certificateFile) {
        const formData = new FormData();
        formData.append('certificate', certificateFile);

        response = await axios.post(
          `${API_URL}/certificates/verify`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      } else if (verificationMethod === 'hash' && certificateHash) {
        response = await axios.get(
          `${API_URL}/certificates/verify/${certificateHash}`
        );
      } else {
        throw new Error('Please provide a certificate file or hash');
      }

      setResult({
        type: response.data.verification.isValid ? 'success' : 'error',
        message: response.data.verification.message,
        data: response.data.verification
      });

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify certificate');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setCertData({
      recipient: { name: '', email: '', id: '' },
      certificate: {
        type: 'academic',
        title: '',
        description: '',
        issuedDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        grade: '',
        credits: ''
      },
      issuer: {
        name: user?.organization?.name || '',
        authority: '',
        contact: ''
      }
    });
    setCertificateFile(null);
    setCertificateHash('');
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📜 Certificate Manager
        </h1>
        <p className="text-gray-600">
          Issue and verify blockchain-based certificates with CATE
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('issue')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'issue'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🎓 Issue Certificate
            </button>
            <button
              onClick={() => setActiveTab('verify')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'verify'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔍 Verify Certificate
            </button>
          </nav>
        </div>
      </div>

      {/* Issue Certificate Tab */}
      {activeTab === 'issue' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Issue New Certificate
            </h2>
            <p className="text-gray-600">
              Create a new blockchain-verified certificate
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recipient Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Recipient Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={certData.recipient.name}
                  onChange={(e) => handleCertDataChange('recipient', 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={certData.recipient.email}
                  onChange={(e) => handleCertDataChange('recipient', 'email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john.doe@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Number
                </label>
                <input
                  type="text"
                  value={certData.recipient.id}
                  onChange={(e) => handleCertDataChange('recipient', 'id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="STU123456"
                />
              </div>
            </div>

            {/* Certificate Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Certificate Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate Type *
                </label>
                <select
                  value={certData.certificate.type}
                  onChange={(e) => handleCertDataChange('certificate', 'type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="academic">Academic</option>
                  <option value="professional">Professional</option>
                  <option value="skill">Skill</option>
                  <option value="achievement">Achievement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={certData.certificate.title}
                  onChange={(e) => handleCertDataChange('certificate', 'title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Bachelor of Science in Computer Science"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={certData.certificate.description}
                  onChange={(e) => handleCertDataChange('certificate', 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Certificate description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    value={certData.certificate.issuedDate}
                    onChange={(e) => handleCertDataChange('certificate', 'issuedDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={certData.certificate.expiryDate}
                    onChange={(e) => handleCertDataChange('certificate', 'expiryDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grade
                  </label>
                  <input
                    type="text"
                    value={certData.certificate.grade}
                    onChange={(e) => handleCertDataChange('certificate', 'grade', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="A+"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    value={certData.certificate.credits}
                    onChange={(e) => handleCertDataChange('certificate', 'credits', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="120"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex space-x-4">
            <button
              onClick={handleIssueCertificate}
              disabled={loading || !certData.recipient.name || !certData.recipient.email || !certData.certificate.title}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Issuing...' : '🎓 Issue Certificate'}
            </button>
            
            <button
              onClick={resetForm}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
            >
              Reset Form
            </button>
          </div>
        </div>
      )}

      {/* Verify Certificate Tab */}
      {activeTab === 'verify' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Verify Certificate
            </h2>
            <p className="text-gray-600">
              Verify the authenticity of a CATE certificate
            </p>
          </div>

          {/* Verification Method Selection */}
          <div className="mb-6">
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="file"
                  checked={verificationMethod === 'file'}
                  onChange={(e) => setVerificationMethod(e.target.value)}
                  className="mr-2"
                />
                Upload Certificate File
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="hash"
                  checked={verificationMethod === 'hash'}
                  onChange={(e) => setVerificationMethod(e.target.value)}
                  className="mr-2"
                />
                Enter Certificate Hash
              </label>
            </div>
          </div>

          {/* File Upload */}
          {verificationMethod === 'file' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certificate File (.catecert)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".catecert,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Choose File
                </button>
                {certificateFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {certificateFile.name}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Hash Input */}
          {verificationMethod === 'hash' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certificate Hash
              </label>
              <input
                type="text"
                value={certificateHash}
                onChange={(e) => setCertificateHash(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Enter 64-character SHA-256 hash..."
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={handleVerifyCertificate}
              disabled={loading || (verificationMethod === 'file' && !certificateFile) || (verificationMethod === 'hash' && !certificateHash)}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Verifying...' : '🔍 Verify Certificate'}
            </button>
            
            <button
              onClick={resetForm}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className={`mt-6 p-4 rounded-lg ${
          result.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            <div className={`w-5 h-5 rounded-full mr-3 ${
              result.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <h3 className={`font-medium ${
              result.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {result.message}
            </h3>
          </div>
          
          {result.data && (
            <div className="mt-3">
              <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="w-5 h-5 bg-red-500 rounded-full mr-3"></div>
            <h3 className="font-medium text-red-800">Error</h3>
          </div>
          <p className="mt-1 text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
