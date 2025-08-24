import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import axios from "axios";

export default function CredentialManager() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Form states
  const [issueForm, setIssueForm] = useState({
    subject: "",
    metadataURI: ""
  });
  const [verifyForm, setVerifyForm] = useState({
    credentialId: ""
  });

  // Mock credentials for demo
  useEffect(() => {
    setCredentials([
      {
        id: "0x1234567890abcdef...",
        issuer: "0xCATE...",
        subject: "0xValeria...",
        metadataURI: "ipfs://QmExample...",
        revoked: false,
        issuedAt: "2024-01-15T10:30:00Z",
        status: "valid"
      },
      {
        id: "0xabcdef1234567890...",
        issuer: "0xCATE...",
        subject: "0xCarlos...",
        metadataURI: "ipfs://QmAnother...",
        revoked: true,
        issuedAt: "2024-01-10T14:20:00Z",
        status: "revoked"
      }
    ]);
  }, []);

  const handleIssueCredential = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/vc', issueForm, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setToast(`✅ Credencial emitida: ${response.data.credentialId}`);
      setShowIssueForm(false);
      setIssueForm({ subject: "", metadataURI: "" });

      // Agregar a la lista
      setCredentials(prev => [{
        id: response.data.credentialId,
        issuer: response.data.issuer,
        subject: response.data.subject,
        metadataURI: issueForm.metadataURI,
        revoked: false,
        issuedAt: response.data.issuedAt,
        status: "valid"
      }, ...prev]);

    } catch (error) {
      setToast(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCredential = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.get(`/api/vc/verify/${verifyForm.credentialId}`);
      setVerificationResult(response.data);
      setToast(`🔍 Verificación completada`);
    } catch (error) {
      setVerificationResult({
        valid: false,
        error: error.response?.data?.error || error.message
      });
      setToast(`❌ Error en verificación`);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeCredential = async (credentialId) => {
    if (!confirm('¿Estás seguro de que quieres revocar esta credencial?')) return;

    setLoading(true);

    try {
      await axios.delete(`/api/vc/${credentialId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setCredentials(prev => prev.map(cred => 
        cred.id === credentialId ? { ...cred, revoked: true, status: "revoked" } : cred
      ));

      setToast(`🗑️ Credencial revocada`);
    } catch (error) {
      setToast(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Credenciales Verificables</h2>
        <motion.button
          className="btn btn-primary"
          onClick={() => setShowIssueForm(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Emitir Credencial
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-semibold text-primary">
            {credentials.length}
          </div>
          <div className="text-sm text-slate-600">Total Credenciales</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-semibold text-success-600">
            {credentials.filter(c => !c.revoked).length}
          </div>
          <div className="text-sm text-slate-600">Válidas</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-semibold text-warning-600">
            {credentials.filter(c => c.revoked).length}
          </div>
          <div className="text-sm text-slate-600">Revocadas</div>
        </div>
      </div>

      {/* Verificar Credencial */}
      <motion.div 
        className="card"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Verificar Credencial</h3>
          <motion.button
            className="btn btn-ghost"
            onClick={() => setShowVerifyForm(!showVerifyForm)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {showVerifyForm ? "Ocultar" : "Mostrar"}
          </motion.button>
        </div>

        <AnimatePresence>
          {showVerifyForm && (
            <motion.form
              onSubmit={handleVerifyCredential}
              className="space-y-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ID de Credencial
                </label>
                <input
                  type="text"
                  value={verifyForm.credentialId}
                  onChange={(e) => setVerifyForm({ credentialId: e.target.value })}
                  placeholder="0x1234567890abcdef..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              <motion.button
                type="submit"
                className="btn btn-accent w-full"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? "Verificando..." : "Verificar"}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Resultado de verificación */}
        <AnimatePresence>
          {verificationResult && (
            <motion.div
              className={`mt-4 p-4 rounded-xl border ${
                verificationResult.valid 
                  ? 'bg-success-50 border-success-200' 
                  : 'bg-error-50 border-error-200'
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-3 h-3 rounded-full ${
                  verificationResult.valid ? 'bg-success-500' : 'bg-error-500'
                }`} />
                <span className="font-medium">
                  {verificationResult.valid ? "Credencial Válida" : "Credencial Inválida"}
                </span>
              </div>
              {verificationResult.valid ? (
                <div className="text-sm space-y-1">
                  <div><strong>Emisor:</strong> {verificationResult.issuer}</div>
                  <div><strong>Sujeto:</strong> {verificationResult.subject}</div>
                  <div><strong>Emitida:</strong> {new Date(verificationResult.issuedAt).toLocaleDateString()}</div>
                </div>
              ) : (
                <div className="text-sm text-error-700">
                  {verificationResult.error}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Lista de Credenciales */}
      <div className="card">
        <h3 className="font-semibold text-slate-900 mb-4">Mis Credenciales</h3>
        <div className="space-y-3">
          <AnimatePresence>
            {credentials.map((credential, index) => (
              <motion.div
                key={credential.id}
                className={`p-4 rounded-xl border ${
                  credential.revoked 
                    ? 'bg-slate-50 border-slate-200' 
                    : 'bg-white border-slate-200'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${
                        credential.revoked ? 'bg-warning-500' : 'bg-success-500'
                      }`} />
                      <span className="text-sm font-medium text-slate-700">
                        {credential.revoked ? "Revocada" : "Válida"}
                      </span>
                      <span className="badge badge-secondary">
                        {credential.id.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <div><strong>Emisor:</strong> {credential.issuer}</div>
                      <div><strong>Sujeto:</strong> {credential.subject}</div>
                      <div><strong>Emitida:</strong> {new Date(credential.issuedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  {!credential.revoked && (
                    <motion.button
                      onClick={() => handleRevokeCredential(credential.id)}
                      className="btn btn-ghost text-error-600 hover:text-error-700"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      Revocar
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal para emitir credencial */}
      <AnimatePresence>
        {showIssueForm && (
          <motion.div
            className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="card max-w-md w-full"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <h3 className="text-lg font-semibold mb-4">Emitir Nueva Credencial</h3>
              <form onSubmit={handleIssueCredential} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Dirección del Sujeto
                  </label>
                  <input
                    type="text"
                    value={issueForm.subject}
                    onChange={(e) => setIssueForm({ ...issueForm, subject: e.target.value })}
                    placeholder="0x..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    URI de Metadatos
                  </label>
                  <input
                    type="text"
                    value={issueForm.metadataURI}
                    onChange={(e) => setIssueForm({ ...issueForm, metadataURI: e.target.value })}
                    placeholder="ipfs://QmExample..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="btn btn-ghost flex-1"
                    onClick={() => setShowIssueForm(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                    disabled={loading}
                  >
                    {loading ? "Emitiendo..." : "Emitir"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed bottom-20 right-4 bg-white shadow-card rounded-xl px-4 py-3 border border-slate-200 z-50"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <div className="text-sm font-medium text-slate-900">{toast}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
