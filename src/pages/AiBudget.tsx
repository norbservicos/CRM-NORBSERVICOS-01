import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Upload, 
  Image as ImageIcon, 
  Loader2, 
  Brain,
  DollarSign,
  Clock,
  Zap,
  Copy,
  Check,
  MessageSquare,
  AlertCircle,
  FileText,
  Share2,
  CreditCard,
  User
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from '../utils/utils';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface AiBudgetResult {
  serviceName: string;
  description: string;
  priceRange: {
    min: number;
    max: number;
  };
  estimatedTime: string;
  salesTip: string;
  technicalDetails: string[];
  clientMessages: {
    professional: string;
    casual: string;
    whatsapp: string;
  };
}

export default function AiBudget() {
  const [image, setImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiBudgetResult | null>(null);
  const [error, setError] = useState<{ message: string; submessage?: string } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  
  // Budget customization state
  const [clientName, setClientName] = useState('');
  const [pixPrice, setPixPrice] = useState('');
  const [cardPrice, setCardPrice] = useState('');
  const [showBothPayments, setShowBothPayments] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const budgetRef = useRef<HTMLDivElement>(null);

  const compressImage = (base64Str: string): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Falha ao criar contexto do canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve({
          data: compressedBase64.split(',')[1],
          mimeType: 'image/jpeg'
        });
      };
      img.onerror = (err) => reject(err);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setError({ message: 'A imagem é muito grande (Máx 20MB)' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setImageMimeType(file.type || 'image/jpeg');
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const generateBudget = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setError({ 
        message: 'A chave da API (GEMINI_API_KEY) não foi encontrada.',
        submessage: 'Verifique se a chave está configurada no painel Settings > Secrets.' 
      });
      setLoading(false);
      return;
    }

    try {
      const { data: compressedData, mimeType: finalMimeType } = await compressImage(image);
      const ai = new GoogleGenAI({ apiKey });
      
      const imagePart = {
        inlineData: {
          mimeType: finalMimeType,
          data: compressedData,
        },
      };

      const prompt = `Analise esta imagem de um serviço de barbearia/estética e gere um orçamento profissional extremamente preciso baseado na região do Vale do Aço, MG (Ipatinga, Timóteo, Fabriciano).
      Considere que os preços devem ser competitivos mas refletir a qualidade técnica observada.
      
      Gere também 3 opções de textos para enviar ao cliente:
      1. Professional: Texto formal e detalhado.
      2. Casual: Texto amigável e direto.
      3. WhatsApp: Texto curto com emojis para facilitar a leitura.

      Retorne um JSON com os seguintes campos:
      - serviceName: Nome do serviço
      - description: Descrição do visual analisado
      - priceRange: Objeto com min e max (números)
      - estimatedTime: Tempo em minutos
      - salesTip: Sugestão de upgrade/venda casada
      - technicalDetails: Array de strings com detalhes técnicos
      - clientMessages: Objeto com professional, casual, whatsapp`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              serviceName: { type: Type.STRING },
              description: { type: Type.STRING },
              priceRange: {
                type: Type.OBJECT,
                properties: {
                  min: { type: Type.NUMBER },
                  max: { type: Type.NUMBER }
                },
                required: ["min", "max"]
              },
              estimatedTime: { type: Type.STRING },
              salesTip: { type: Type.STRING },
              technicalDetails: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              clientMessages: {
                type: Type.OBJECT,
                properties: {
                  professional: { type: Type.STRING },
                  casual: { type: Type.STRING },
                  whatsapp: { type: Type.STRING }
                },
                required: ["professional", "casual", "whatsapp"]
              }
            },
            required: ["serviceName", "description", "priceRange", "estimatedTime", "salesTip", "technicalDetails", "clientMessages"]
          }
        }
      });

      const data = JSON.parse(response.text.trim());
      setResult(data);
      setPixPrice(data.priceRange.min.toString());
      setCardPrice(data.priceRange.max.toString());
    } catch (err: any) {
      console.error('Erro na IA:', err);
      const errorMessage = err?.message || '';
      
      if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('API_KEY_INVALID')) {
        setError({
          message: 'Acesso Negado à API',
          submessage: 'Verifique se a sua chave API nas configurações está correta e ativa.'
        });
      } else if (errorMessage.includes('RESOURCE_EXHAUSTED')) {
        setError({
          message: 'Limite de Cota Excedido',
          submessage: 'Muitas solicitações seguidas. Aguarde um momento ou faça upgrade da sua chave API.'
        });
      } else {
        setError({
          message: 'Não foi possível gerar o orçamento',
          submessage: 'Tente novamente com outra imagem ou verifique sua conexão.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const exportToPdf = async () => {
    if (!budgetRef.current) return;
    setGeneratingPdf(true);
    try {
      const canvas = await html2canvas(budgetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Orcamento_${clientName || 'Cliente'}_${new Date().toLocaleDateString()}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="text-blue-900" size={32} />
            Orçamento AI
          </h1>
          <p className="text-slate-500 mt-1">Estimativa inteligente baseada na região do Vale do Aço.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative aspect-video rounded-[32px] border-4 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-8 text-center",
              image ? "border-blue-900/20 bg-blue-50/30" : "border-slate-200 hover:border-blue-900/30 bg-white"
            )}
          >
            {image ? (
              <>
                <img 
                  src={image} 
                  alt="Preview" 
                  className="absolute inset-0 w-full h-full object-cover rounded-[28px]" 
                />
                <div className="absolute inset-0 bg-black/40 rounded-[28px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="bg-white p-4 rounded-2xl flex items-center gap-2 text-slate-900 font-bold">
                    <Upload size={20} />
                    Trocar Imagem
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <ImageIcon size={32} />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">Importar Referência</p>
                  <p className="text-sm text-slate-500">Aceita qualquer formato de imagem</p>
                </div>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          <button
            onClick={generateBudget}
            disabled={!image || loading}
            className={cn(
              "w-full py-5 rounded-[24px] font-black text-lg flex items-center justify-center gap-3 transition-all",
              !image || loading
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-blue-900 text-white hover:bg-black shadow-xl shadow-blue-900/20 active:scale-95"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                Analisando Estilo...
              </>
            ) : (
              <>
                <Brain size={24} />
                Gerar Orçamento Inteligente
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-shake">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black">{error.message}</p>
                {error.submessage && <p className="text-xs opacity-80 mt-1">{error.submessage}</p>}
              </div>
            </div>
          )}

          {result && (
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 text-blue-900 mb-2">
                <FileText size={24} />
                <h3 className="font-black text-xl">Preencher Orçamento</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                    <User size={12} /> Nome do Cliente
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-900/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                      <DollarSign size={12} /> Pix/Dinheiro (R$)
                    </label>
                    <input
                      type="number"
                      value={pixPrice}
                      onChange={(e) => setPixPrice(e.target.value)}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-900/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                      <CreditCard size={12} /> Cartão (R$)
                    </label>
                    <input
                      type="number"
                      value={cardPrice}
                      onChange={(e) => setCardPrice(e.target.value)}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-900/10"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="showBoth" 
                      checked={showBothPayments}
                      onChange={(e) => setShowBothPayments(e.target.checked)}
                      className="w-5 h-5 rounded-lg text-blue-900 focus:ring-blue-900" 
                    />
                    <label htmlFor="showBoth" className="text-sm font-bold text-slate-700">Mostrar PIX e Cartão no PDF</label>
                  </div>
                </div>
              </div>

              <button
                onClick={exportToPdf}
                disabled={generatingPdf}
                className="w-full py-4 bg-blue-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg"
              >
                {generatingPdf ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Share2 size={20} />
                )}
                Exportar Orçamento (PDF)
              </button>
            </div>
          )}
        </div>

        {/* Results / Preview Section */}
        <div className="relative min-h-[400px]">
          {!result && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/50 rounded-[40px] border border-slate-100 border-dashed">
              <Sparkles size={48} className="text-slate-200 mb-4" />
              <p className="text-slate-400 font-medium">Aguardando análise da imagem...</p>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-[40px] shadow-sm animate-pulse">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Brain className="text-blue-900 animate-bounce" size={24} />
              </div>
              <p className="text-blue-900 font-black">Consultando Mercado Regional...</p>
              <p className="text-slate-400 text-xs mt-2">Vale do Aço, MG</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* PDF Preview Document Area */}
              <div 
                ref={budgetRef}
                className="bg-white p-10 space-y-8 w-full max-w-[600px] border border-slate-100 shadow-xl mx-auto rounded-3xl"
              >
                {/* Header with Logo */}
                <div className="flex justify-between items-start border-b-2 border-blue-900/10 pb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white rotate-3">
                      <Sparkles size={28} />
                    </div>
                    <div>
                      <h3 className="font-black text-2xl text-slate-900 tracking-tighter">NORB PRO</h3>
                      <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block uppercase tracking-widest mt-1">Gestão Inteligente</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data de Emissão</p>
                    <p className="text-lg font-black text-slate-900">{new Date().toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                {/* Client Box */}
                <div className="bg-slate-900 p-6 rounded-2xl flex items-center justify-between text-white">
                  <div>
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Orçamento para</span>
                    <h4 className="text-xl font-black">{clientName || 'Cliente'}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Procedência</span>
                    <p className="text-xs font-bold">Vale do Aço - MG</p>
                  </div>
                </div>

                {/* Main Content */}
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Descrição do Serviço</span>
                    <h2 className="text-3xl font-black text-slate-900 mt-2">{result.serviceName}</h2>
                    <p className="text-slate-600 text-sm mt-3 leading-relaxed border-l-4 border-blue-900 pl-4 italic">
                      {result.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-6">
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Tempo Estipulado</span>
                      <p className="text-lg font-bold text-slate-900">{result.estimatedTime}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Validade Orçamento</span>
                      <p className="text-lg font-bold text-slate-900">10 Dias</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Análise Técnica</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                       {result.technicalDetails.map((detail, i) => (
                         <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                           <div className="w-1.5 h-1.5 bg-blue-900 rounded-full shrink-0" />
                           {detail}
                         </div>
                       ))}
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-3 pt-6">
                   <span className="text-[10px] font-black text-slate-400 uppercase">Formas de Pagamento</span>
                   <div className="grid gap-3">
                      {(showBothPayments || parseFloat(pixPrice) > 0) && (
                        <div className="p-6 bg-blue-50 border-2 border-blue-100 rounded-3xl flex justify-between items-center">
                          <div>
                            <p className="text-xs font-black text-blue-900 uppercase">À Vista (Pix/Dinheiro)</p>
                            <p className="text-4xl font-black text-slate-900">R$ {pixPrice || '0,00'}</p>
                          </div>
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-900 border border-blue-100 shadow-sm">
                            <Zap size={24} />
                          </div>
                        </div>
                      )}
                      
                      {(showBothPayments || parseFloat(cardPrice) > 0) && (
                        <div className="p-6 bg-white border-2 border-slate-100 rounded-3xl flex justify-between items-center">
                          <div>
                            <p className="text-xs font-black text-slate-400 uppercase">Cartão de Crédito</p>
                            <p className="text-3xl font-black text-slate-900">R$ {cardPrice || '0,00'}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 italic italic">Consulte taxas de parcelamento</p>
                          </div>
                          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 border border-slate-100">
                            <CreditCard size={24} />
                          </div>
                        </div>
                      )}
                   </div>
                </div>

                {/* Footer Info */}
                <div className="pt-10 border-t border-slate-100 flex justify-between items-center opacity-40">
                  <p className="text-[10px] font-bold text-slate-500">NORB GESTÃO PRO • INTELIGÊNCIA EM ESTÉTICA</p>
                  <p className="text-[10px] font-bold text-slate-500 italic">Vale do Aço - MG</p>
                </div>
              </div>

               {/* Templates Area */}
               <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-6">
                <h3 className="font-black text-slate-900 flex items-center gap-2">
                  <MessageSquare size={18} className="text-blue-900" />
                  Modelos de Mensagem
                </h3>
                
                <div className="space-y-4">
                  {[
                    { id: 'professional', label: 'Profissional', text: result.clientMessages.professional },
                    { id: 'casual', label: 'Casual', text: result.clientMessages.casual },
                    { id: 'whatsapp', label: 'WhatsApp', text: result.clientMessages.whatsapp },
                  ].map((msg) => (
                    <div key={msg.id} className="group relative bg-slate-50 border border-slate-100 rounded-[20px] p-4 transition-all hover:bg-white hover:shadow-md">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{msg.label}</span>
                        <button 
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            copiedIndex === msg.id ? "bg-green-100 text-green-600" : "bg-white text-slate-400 hover:text-blue-900 shadow-sm"
                          )}
                        >
                          {copiedIndex === msg.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed italic line-clamp-3 group-hover:line-clamp-none transition-all">
                        "{msg.text}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
