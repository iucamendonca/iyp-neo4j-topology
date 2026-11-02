import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import { Search, Server, Globe, Shield, Network, AlertCircle, Loader2, MapPin, LayoutGrid, Share2, Sparkles } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import type { IYPResponse } from './types/iyp';

export function App() {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [data, setData] = useState<IYPResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'cards' | 'both'>('graph');

  // Ajuste dinâmico de tamanho do Grafo
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 520
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [viewMode, data]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const isPrefix = query.includes('/') || query.includes('.');
      let param = isPrefix ? `prefixo=${encodeURIComponent(query.trim())}` : `asn=${encodeURIComponent(query.trim())}`;
      
      if (country.trim()) {
        param += `&pais=${encodeURIComponent(country.trim().toUpperCase())}`;
      }

      const response = await axios.get<IYPResponse>(`/api/v1/iyp/consulta?${param}`);
      setData(response.data);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Limite de requisições excedido (Rate Limit). Aguarde alguns segundos.');
      } else {
        setError(err.response?.data?.detail || 'Erro ao consultar a infraestrutura.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Mapeamento dos Nós e Arestas para o Grafo Canvas
  const graphData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };

    const nodes: any[] = [];
    const links: any[] = [];
    const centralId = data.asn_consultado || 'ASN';

    // Nó ASN Central
    nodes.push({
      id: centralId,
      name: `${centralId}\n${data.organizacao || ''}`,
      val: 22,
      color: '#38bdf8'
    });

    // Países
    data.paises.forEach((p) => {
      const id = `País: ${p}`;
      nodes.push({ id, name: id, val: 12, color: '#f59e0b' });
      links.push({ source: centralId, target: id });
    });

    // Prefixos IP (Top 18)
    data.prefixos_anunciados.slice(0, 18).forEach((p) => {
      const id = `${p}`;
      nodes.push({ id, name: id, val: 8, color: '#c084fc' });
      links.push({ source: centralId, target: id });
    });

    // Siblings (Top 12)
    data.siblings.slice(0, 12).forEach((s) => {
      const id = `${s}`;
      nodes.push({ id, name: id, val: 10, color: '#38bdf8' });
      links.push({ source: centralId, target: id });
    });

    // Top Domínios & Rankings
    data.top_domains.slice(0, 12).forEach((d) => {
      const id = `${d}`;
      nodes.push({ id, name: id, val: 9, color: '#34d399' });
      links.push({ source: centralId, target: id });
    });

    return { nodes, links };
  }, [data]);

  return (
    <div style={{ padding: '2.5rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <header style={{ textAlign: 'center', marginBottom: '2.5rem' }} className="animate-fade-in">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.35rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
          <Sparkles size={14} /> Neo4j Knowledge Graph Engine
        </div>
        <h1 style={{ fontSize: '2.75rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Internet Yellow Pages
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '1.05rem' }}>
          Mapeamento de rotas BGP, interconexões de ASNs e topologia de rede
        </p>
      </header>

      {/* Formulário de Busca */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }} className="animate-fade-in">
        <div style={{ flex: '3', minWidth: '260px' }}>
          <input
            type="text"
            placeholder="ASN (ex: 13335, 12837) ou Prefixo IP (ex: 172.70.229.0/24)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="font-mono glass-panel"
            style={{
              width: '100%',
              padding: '0.9rem 1.25rem',
              borderRadius: '0.75rem',
              color: '#fff',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div 
  className="glass-panel font-mono" 
  style={{ flex: '1', minWidth: '150px', display: 'flex', alignItems: 'center', paddingLeft: '0.85rem', borderRadius: '0.75rem' }}
>
          <MapPin size={18} style={{ color: '#38bdf8' }} />
          <input
            type="text"
            placeholder="PAÍS (EX: US)"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            maxLength={2}
            style={{
              width: '100%',
              padding: '0.9rem 0.75rem',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none',
              textTransform: 'uppercase'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.9rem 2rem',
            borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#fff',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
            transition: 'all 0.2s'
          }}
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
          Consultar
        </button>
      </form>

      {error && (
        <div style={{ padding: '1rem 1.25rem', borderRadius: '0.75rem', backgroundColor: 'rgba(127, 29, 29, 0.5)', border: '1px solid #ef4444', color: '#fca5a5', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }} className="animate-fade-in">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <div className="animate-fade-in">
          {/* Seletor de Modo de Visualização */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              Exibindo resultados para <strong style={{ color: '#38bdf8' }} className="font-mono">{data.asn_consultado || query}</strong>
            </span>

            <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.3rem', borderRadius: '0.5rem', border: '1px solid #334155' }}>
              <button
                onClick={() => setViewMode('graph')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: viewMode === 'graph' ? '#0284c7' : 'transparent',
                  color: viewMode === 'graph' ? '#fff' : '#94a3b8',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <Share2 size={15} /> Grafo Interativo
              </button>
              <button
                onClick={() => setViewMode('cards')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: viewMode === 'cards' ? '#0284c7' : 'transparent',
                  color: viewMode === 'cards' ? '#fff' : '#94a3b8',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <LayoutGrid size={15} /> Painel de Cards
              </button>
            </div>
          </div>

          {/* MODO 1: GRAFO INTERATIVO */}
          {(viewMode === 'graph' || viewMode === 'both') && (
            <div className="glass-panel" style={{ borderRadius: '1rem', padding: '1.25rem', marginBottom: '2rem' }}>
              {/* Legenda de Cores */}
              <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.825rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#e2e8f0' }}><span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#38bdf8' }}></span> ASN Central</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#e2e8f0' }}><span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#f59e0b' }}></span> Países</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#e2e8f0' }}><span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#c084fc' }}></span> Prefixos IP</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#e2e8f0' }}><span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#34d399' }}></span> Top Domínios / Rankings</span>
              </div>

              <div ref={containerRef} style={{ height: '520px', width: '100%', borderRadius: '0.75rem', overflow: 'hidden', background: '#020617' }}>
                <ForceGraph2D
                  width={dimensions.width}
  height={dimensions.height}
  graphData={graphData}
  nodeRelSize={7}
  d3VelocityDecay={0.2}
  cooldownTicks={100}
                  backgroundColor="#020617"
                  nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const label = node.name;
                    const fontSize = Math.max(10 / globalScale, 3.5);
                    ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;

                    // Brilho Neon
                    ctx.shadowColor = node.color;
                    ctx.shadowBlur = 8;
                    
                    // Nó
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.val / 2, 0, 2 * Math.PI, false);
                    ctx.fillStyle = node.color;
                    ctx.fill();

                    // Reset de Sombra para o Texto
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(label, node.x, node.y + (node.val / 2) + 6);
                  }}
                  linkColor={() => 'rgba(51, 65, 85, 0.6)'}
                  linkWidth={1.5}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleSpeed={0.006}
                  linkDirectionalParticleWidth={2.5}
                />
              </div>
            </div>
          )}

          {/* MODO 2: PAINEL DE CARDS */}
          {(viewMode === 'cards' || viewMode === 'both') && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.85rem' }}>
                <h3 style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, fontSize: '1.1rem' }}>
                  <Server size={18} /> Identificação
                </h3>
                <p><strong>ASN:</strong> <span className="font-mono">{data.asn_consultado || 'N/A'}</span></p>
                <p><strong>Organização:</strong> {data.organizacao || 'Não informada'}</p>
                <p><strong>Países:</strong> {data.paises.length ? data.paises.join(', ') : 'N/A'}</p>
                <p><strong>Sessões Peers BGP:</strong> <span className="font-mono">{data.total_peers_bgp.toLocaleString()}</span></p>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.85rem' }}>
                <h3 style={{ color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, fontSize: '1.1rem' }}>
                  <Network size={18} /> Prefixos Anunciados
                </h3>
                {data.prefixos_anunciados.length > 0 ? (
                  <ul className="font-mono" style={{ paddingLeft: '1.2rem', margin: 0, maxHeight: '150px', overflowY: 'auto', fontSize: '0.85rem' }}>
                    {data.prefixos_anunciados.map((p, i) => (
                      <li key={i} style={{ marginBottom: '0.35rem' }}>{p}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: '#64748b' }}>Nenhum prefixo registrado.</p>
                )}
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.85rem' }}>
                <h3 style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, fontSize: '1.1rem' }}>
                  <Shield size={18} /> ASNs Irmãos (Siblings)
                </h3>
                {data.siblings.length > 0 ? (
                  <div className="font-mono" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '150px', overflowY: 'auto' }}>
                    {data.siblings.map((s, i) => (
                      <span key={i} style={{ backgroundColor: 'rgba(3, 105, 161, 0.4)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.8rem', color: '#7dd3fc' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#64748b' }}>Nenhum irmão mapeado.</p>
                )}
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '0.85rem' }}>
                <h3 style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0, fontSize: '1.1rem' }}>
                  <Globe size={18} /> Top Domínios & Rankings
                </h3>
                {data.top_domains.length > 0 ? (
                  <ul style={{ paddingLeft: '1.2rem', margin: 0, maxHeight: '150px', overflowY: 'auto', fontSize: '0.85rem' }}>
                    {data.top_domains.map((d, i) => (
                      <li key={i} style={{ marginBottom: '0.35rem' }}>{d}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: '#64748b' }}>Sem dados de ranking.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;