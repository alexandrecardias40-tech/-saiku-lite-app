import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";
import { Upload, CheckCircle, AlertCircle, Loader } from "lucide-react";

export default function DataUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validar se é arquivo Excel
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setStatus('error');
        setMessage('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
        return;
      }
      setFile(selectedFile);
      setStatus('idle');
      setMessage("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus('error');
      setMessage('Selecione um arquivo para fazer upload');
      return;
    }

    setUploading(true);
    setProgress(0);
    setStatus('idle');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simular progresso
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/dashboard/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      clearInterval(progressInterval);

      if (response.ok) {
        setProgress(100);
        setStatus('success');
        setMessage(`Arquivo "${file.name}" enviado com sucesso! Os dados foram atualizados.`);
        setFile(null);
        setTimeout(() => {
          setProgress(0);
          setStatus('idle');
        }, 3000);
      } else {
        throw new Error('Erro ao fazer upload');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Erro ao fazer upload do arquivo. Tente novamente.');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Atualizar Dados</h1>
          <p className="text-slate-600 mt-1">Carregue uma nova planilha orçamentária para atualizar as informações do dashboard</p>
        </div>

        {/* Upload Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Upload className="w-5 h-5" />
              Carregar Planilha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Input */}
            <div>
              <label htmlFor="file-input" className="block">
                <button
                  type="button"
                  onClick={() => document.getElementById('file-input')?.click()}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Selecionar Arquivo
                </button>
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-input"
              />
            </div>

            {/* Selected File Info */}
            {file && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-slate-700">
                  <strong>Arquivo selecionado:</strong> {file.name}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Tamanho: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            {/* Status Messages */}
            {status === 'success' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">{message}</p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">{message}</p>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {uploading && progress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Enviando...</p>
                  <p className="text-sm font-semibold text-blue-600">{progress}%</p>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                !file || uploading
                  ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {uploading && <Loader className="w-5 h-5 animate-spin" />}
              {uploading ? 'Enviando...' : 'Fazer Upload'}
            </button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-0 shadow-lg bg-blue-50 border-l-4 border-l-blue-600">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900">Instruções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-slate-700">
              <div>
                <p className="font-semibold text-slate-900">1. Prepare o arquivo:</p>
                <p className="text-slate-600 ml-4">Certifique-se de que a planilha possui as mesmas colunas da planilha original</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">2. Selecione o arquivo:</p>
                <p className="text-slate-600 ml-4">Clique no botão ou arraste o arquivo para a área indicada</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">3. Envie:</p>
                <p className="text-slate-600 ml-4">Clique em "Fazer Upload" para atualizar os dados</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">4. Aguarde:</p>
                <p className="text-slate-600 ml-4">Os dados serão processados e o dashboard será atualizado automaticamente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supported Columns */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900">Colunas Suportadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-slate-900 mb-2">Obrigatórias:</p>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>✓ UGR</li>
                  <li>✓ Total Anual Estimado</li>
                  <li>✓ Total Empenho RAP</li>
                  <li>✓ Data Contrato</li>
                  <li>✓ Data Vencimento</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-2">Opcionais:</p>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>✓ Descrição</li>
                  <li>✓ Status</li>
                  <li>✓ Observações</li>
                  <li>✓ Responsável</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
