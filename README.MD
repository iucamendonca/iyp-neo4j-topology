# 🌐 Internet Yellow Pages (IYP) — Mapeamento e Análise de ASNs

Aplicação *full-stack* containerizada para consulta, análise topológica e visualização gráfica de rotas BGP, ASNs (Sistemas Autónomos), blocos de prefixos IP, entidades organizacionais e métricas de ranking na Internet, integrada com o banco de dados Neo4j.

---

## 🛠️ Arquitetura e Tecnologias

A solução é orquestrada via **Docker Compose** e dividida em 4 serviços integrados em rede interna:

* **Frontend (`iyp-web`):** React 18, TypeScript, Vite, `react-force-graph-2d` (renderização em HTML5 Canvas), Lucide Icons e tipografia `JetBrains Mono` / `Inter`. Oferece modo duplo de visualização (Painel de Cards e Grafo Interativo).
* **Backend API (`iyp-api`):** FastAPI (Python 3.10+) utilizando o driver oficial do Neo4j (`neo4j-python-driver`) com validação estrita de rotas e tratamento robusto de exceções.
* **Proxy / Rate Limiter (`iyp-nginx`):** Nginx como *reverse proxy* unificado. Gerencia o roteamento de portas, previne CORS e aplica limite de taxa (*Rate Limiting*) de **5 req/s** com retenção em *burst=5* e resposta `HTTP 429`.
* **Banco de Dados (`iyp-neo4j`):** Neo4j Community Edition 5.x (Orientado a Grafos), armazenando nós e arestas da topologia BGP do Internet Yellow Pages.

                ┌─────────────────────────────────────────┐
                │            Navegador Web                │
                └───────────────────┬─────────────────────┘
                                    │ Porta 80
                                    ▼
                ┌─────────────────────────────────────────┐
                │              iyp-nginx                  │
                │   (Proxy Reverso & Rate Limit 5r/s)     │
                └───────────┬─────────────────┬───────────┘
                            │                 │
                   /api/    │                 │ /
                            ▼                 ▼
                ┌──────────────┐           ┌──────────────┐
                │   iyp-api    │           │   iyp-web    │
                │  (FastAPI)   │           │ (React + TS) │
                └───────┬──────┘           └──────────────┘
                        │ Bolt (7687)
                        ▼
                ┌──────────────┐
                │  iyp-neo4j   │
                │   (Neo4j)    │
                └──────────────┘

## 🚀 Como Executar a Aplicação

### Pré-requisitos
* Docker (v20.10+)
* Docker Compose (v2.x+)

### Passos de Inicialização
1. Clone o repositório para o seu ambiente local:
   ```bash
   git clone https://github.com/iucamendonca/iyp-neo4j-topology.git
   cd iyp-neo4j-topology

   docker compose up -d --build

   docker compose ps

   http://localhost

-------------------------------------------------------------------------------------------

📋 Cobertura dos Requisitos da Atividade (Slide 55)
O projeto cumpre integralmente os requisitos de consulta topológica estipulados no enunciado da disciplina:

1. Item 5a — Top Domínios / Rankings por AS, Prefixo e País
Implementação: O endpoint /api/v1/iyp/consulta aceita os parâmetros asn, prefixo e pais (ex: US, BR).

Mapeamento: A API consulta as arestas (:AS)-[:RANK]->(rk:Ranking) no Neo4j e extrai os rótulos de impacto e domínios associados.

Frontend: Formulário com suporte a busca simultânea e seletor de modo de visualização.

2. Item 5b — ASNs Irmãos (Siblings)
Implementação: Mapeamento de ASNs sob o domínio da mesma organização via travessia Cypher:MATCH (a:AS)-[:OWN]->(o:Organization)<-[:OWN]-(s:AS) WHERE s <> a

Frontend: Exibição destacada no card de identificação e como nós azuis no Grafo Interativo.

3. Item 5c — Relação entre Top Domínios e IXPs
Nota Técnica de Auditoria: Após auditoria direta na base via Cypher (MATCH (n) WHERE any(lbl IN labels(n) WHERE lbl CONTAINS "IXP")), constatou-se que o dump de dados do IYP fornecido não possui nós com o rótulo de IXP (Internet Exchange Points).

Solução de Conformidade: A conectividade e a capacidade de peering da rede são apresentadas através das métricas de Sessões Peers BGP e dos relacionamentos de tráfego dos nós :Ranking.

--------------------------------------------------------------------------------------------

📊 Modos de Visualização no Frontend
Painel de Cards: Apresentação textual limpa dividida em 4 blocos (Identificação, Prefixos Anunciados, ASNs Irmãos e Top Domínios & Rankings).

Grafo Interativo (Física 2D): Renderização de um Ego Graph centralizado no ASN/Prefixo consultado com forças de repulsão D3, visualização de partículas em movimento nas arestas e distinção por cores:

🔵 Azul Claro: ASN Central

🟡 Amarelo: Países de Alocação

🟣 Roxo: Prefixos IP Anunciados

🔵 Azul: ASNs Irmãos (Siblings)

🟢 Verde: Top Domínios & Rankings

🔒 Segurança & Rate Limiting (Nginx)
O proxy Nginx foi configurado com a zona de limite api_limit:

Taxa Base: 5r/s (5 requisições por segundo).

Burst: Até 5 requisições em fila temporária (nodelay).

Status de Bloqueio: HTTP 429 Too Many Requests.

Tratamento no Client: O frontend intercepta erros 429 e exibe um alerta intuitivo sem interromper a aplicação.
