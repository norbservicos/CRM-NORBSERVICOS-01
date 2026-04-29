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
  AlertCircle
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from '../utils/utils';

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
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('A imagem deve ter menos de 5MB');
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

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const base64Data = image.split(',')[1];
      const imagePart = {
        inlineData: {
          mimeType: imageMimeType,
          data: base64Data,
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
    } catch (err) {
      console.error('Erro na IA:', err);
      setError('Não foi possível gerar o orçamento. Tente novamente com outra imagem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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
                  <p className="text-sm text-slate-500">Toque aqui para enviar uma foto ou usar a câmera</p>
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
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-shake">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="relative min-h-[400px]">
          {!result && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/50 rounded-[40px] border border-slate-100 border-dashed">
              <Sparkles size={48} className="text-slate-200 mb-4" />
              <p className="text-slate-400 font-medium">Aguardando análise da imagem para gerar os detalhes do orçamento.</p>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-[40px] shadow-sm animate-pulse">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Brain className="text-blue-900 animate-bounce" size={24} />
              </div>
              <p className="text-blue-900 font-black">Consultando Mercado Regional...</p>
              <p className="text-slate-400 text-xs mt-2">Buscando referências no Vale do Aço</p>
            </div>
          )}

          {result && (
            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-900 font-bold uppercase tracking-wider text-xs">
                  <Sparkles size={14} />
                  Análise Finalizada
                </div>
                <h2 className="text-3xl font-black text-slate-900 leading-tight">{result.serviceName}</h2>
                <p className="text-slate-500 text-sm">{result.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-6 rounded-[24px] space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <DollarSign size={18} />
                    <span className="text-xs font-bold uppercase">Preço Estimado</span>
                  </div>
                  <p className="text-2xl font-black text-blue-900">
                    R$ {result.priceRange.min} - {result.priceRange.max}
                  </p>
                </div>
                <div className="bg-slate-50 p-6 rounded-[24px] space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock size={18} />
                    <span className="text-xs font-bold uppercase">Tempo Médio</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900">
                    {result.estimatedTime}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-black text-slate-900 flex items-center gap-2">
                  <Zap className="text-orange-500" size={18} />
                  Dica de Upgrade
                </h3>
                <div className="bg-orange-50 p-5 rounded-[24px] border border-orange-100">
                  <p className="text-sm text-orange-900 leading-relaxed font-medium">
                    {result.salesTip}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-black text-slate-900">Observações Técnicas</h3>
                <div className="grid gap-2">
                  {result.technicalDetails.map((detail, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-slate-600 text-sm group">
                      <div className="w-1.5 h-1.5 bg-blue-900 rounded-full group-hover:scale-150 transition-transform" />
                      {detail}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6 pt-4 border-t border-slate-100">
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

              <button 
                className="w-full flex items-center justify-between p-6 bg-slate-900 text-white rounded-[24px] font-bold hover:bg-black transition-all group shadow-xl shadow-slate-900/10"
                onClick={() => alert('Orçamento aplicado! Agende o cliente agora.')}
              >
                <span>Usar este Orçamento</span>
                <MessageSquare size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Region Info */}
      <div className="bg-blue-900 rounded-[32px] p-8 text-white flex flex-col md:flex-row items-center gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
          <Brain size={32} />
        </div>
        <div className="flex-1 space-y-2 text-center md:text-left relative z-10">
          <h3 className="text-xl font-black">Precisão Regional Vale do Aço</h3>
          <p className="text-blue-100 text-sm leading-relaxed max-w-2xl">
            Nossa IA foi calibrada com dados de mercado de Ipatinga, Coronel Fabriciano, Timóteo e região. 
            As estimativas consideram a complexidade técnica e a valorização profissional de Minas Gerais.
          </p>
        </div>
      </div>
    </div>
  );
}
