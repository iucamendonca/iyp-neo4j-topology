export interface IYPResponse {
  asn_consultado: string | null;
  prefixo_consultado: string | null;
  organizacao: string | null;
  paises: string[];
  siblings: string[];
  prefixos_anunciados: string[];
  total_peers_bgp: number;
  top_domains: string[];
}