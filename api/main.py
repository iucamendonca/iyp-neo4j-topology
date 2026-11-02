import os
import re
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from neo4j import GraphDatabase

app = FastAPI(
    title="Internet Yellow Pages API",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://iyp-neo4j:7687")
driver = GraphDatabase.driver(NEO4J_URI, auth=None)


def get_db_session():
    return driver.session()


@app.get("/health", tags=["Health"])
def health_check():
    try:
        with get_db_session() as session:
            session.run("RETURN 1")
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na ligação ao Neo4j: {str(e)}")


@app.get("/api/v1/iyp/consulta", tags=["Consultas IYP"])
def consultar_infraestrutura(
    asn: str | None = Query(None, description="Número do ASN (ex: 13335 ou AS13335)"),
    prefixo: str | None = Query(None, description="Bloco IP / Prefixo (ex: 1.1.1.0/24)")
):
    if not asn and not prefixo:
        raise HTTPException(
            status_code=400,
            detail="Formato de consulta inválido. Forneça um valor como '13335' ou 'AS13335'."
        )

    resultado = {
        "asn_consultado": None,
        "prefixo_consultado": prefixo,
        "organizacao": None,
        "paises": [],
        "siblings": [],
        "prefixos_anunciados": [],
        "total_peers_bgp": 0,
        "top_domains": []
    }

    with get_db_session() as session:
        if asn:
            clean_asn = re.sub(r"[^\d]", "", str(asn))
            if not clean_asn:
                raise HTTPException(
                    status_code=400,
                    detail="Formato de ASN inválido."
                )

            asn_num = int(clean_asn)
            resultado["asn_consultado"] = f"AS{asn_num}"

            cypher_query_asn = """
            MATCH (a:AS) WHERE a.asn = $asn_num OR a.as = $asn_num
            OPTIONAL MATCH (a)-[:NAME]->(n:Name)
            OPTIONAL MATCH (n)<-[:NAME]-(s:AS) WHERE s <> a
            OPTIONAL MATCH (a)-[:COUNTRY]->(c:Country)
            RETURN 
                collect(DISTINCT n.name) AS nomes,
                collect(DISTINCT coalesce(c.country_code, c.name)) AS paises,
                collect(DISTINCT coalesce(s.asn, s.as)) AS siblings,
                [(a)-[:ORIGINATE]->(p:Prefix) | coalesce(p.prefix, p.name)][..10] AS prefixos,
                COUNT { (a)-[:PEERS_WITH]-() } AS total_peers,
                [(a)-[:RANK]-(rk:Ranking) | coalesce(rk.domain, rk.name, rk.rank, rk.rank_position)][..10] AS top_domains
            """

            res = session.run(cypher_query_asn, asn_num=asn_num).single()

            if res:
                nomes = res["nomes"] or []
                resultado["organizacao"] = max(nomes, key=len) if nomes else None
                resultado["paises"] = [p for p in res["paises"] if p]
                resultado["siblings"] = [
                    f"AS{s}" if isinstance(s, int) else str(s)
                    for s in res["siblings"]
                    if s is not None and str(s) != "0"
                ]
                resultado["prefixos_anunciados"] = [p for p in res["prefixos"] if p]
                resultado["total_peers_bgp"] = res["total_peers"]
                resultado["top_domains"] = [d for d in res["top_domains"] if d]

        elif prefixo:
            cypher_query_prefixo = """
            MATCH (p:Prefix) WHERE p.prefix = $prefixo OR p.name = $prefixo
            OPTIONAL MATCH (p)<-[:ORIGINATE]-(a:AS)
            OPTIONAL MATCH (a)-[:NAME]->(n:Name)
            OPTIONAL MATCH (a)-[:COUNTRY]->(c:Country)
            RETURN 
                coalesce(a.asn, a.as) AS asn,
                collect(DISTINCT n.name) AS nomes,
                collect(DISTINCT coalesce(c.country_code, c.name)) AS paises
            """
            res = session.run(cypher_query_prefixo, prefixo=prefixo).single()
            if res:
                asn_val = res["asn"]
                nomes = res["nomes"] or []
                resultado["asn_consultado"] = f"AS{asn_val}" if asn_val is not None else None
                resultado["organizacao"] = max(nomes, key=len) if nomes else None
                resultado["paises"] = [p for p in res["paises"] if p]

    return resultado