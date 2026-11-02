import sqlite3
import json
import argparse

class ServicoIYPLocal:
    def __init__(self, db_path="iyp_local.db"):
        self.db_path = db_path
        self._inicializar_banco_demonstracao()

    def _get_connection(self):
        return sqlite3.connect(self.db_path)

    def _inicializar_banco_demonstracao(self):
        """Cria as tabelas do IYP e insere dados de exemplo para teste local."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Tabela de Organizações e ASNs (para buscar Siblings)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS asns (
                asn INTEGER PRIMARY KEY,
                org_name TEXT,
                country TEXT
            );
            """)

            # 2. Tabela de IXPs (Pontos de Troca de Tráfego)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS asn_ixps (
                asn INTEGER,
                ixp_name TEXT,
                country TEXT
            );
            """)

            # 3. Tabela de Top Domínios por ASN e Prefixo
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS top_domains (
                asn INTEGER,
                prefix TEXT,
                domain TEXT,
                rank INTEGER
            );
            """)

            # Inserir dados fictícios de teste se o banco estiver vazio
            cursor.execute("SELECT COUNT(*) FROM asns;")
            if cursor.fetchone()[0] == 0:
                # AS2497 (IIJ) e AS4230 (Claro) na mesma ORG de exemplo
                cursor.executemany("INSERT INTO asns VALUES (?, ?, ?);", [
                    (2497, "Internet Initiative Japan", "JP"),
                    (9367, "Internet Initiative Japan", "JP"),  # Sibling do 2497
                    (4230, "Claro Brasil", "BR"),
                    (28573, "Claro Brasil", "BR")               # Sibling do 4230
                ])

                cursor.executemany("INSERT INTO asn_ixps VALUES (?, ?, ?);", [
                    (2497, "JPNAP Tokyo", "JP"),
                    (2497, "BBIX Tokyo", "JP"),
                    (4230, "IX.br São Paulo", "BR"),
                    (4230, "IX.br Porto Alegre", "BR")
                ])

                cursor.executemany("INSERT INTO top_domains VALUES (?, ?, ?, ?);", [
                    (2497, "202.214.0.0/16", "iij.ad.jp", 1),
                    (2497, "202.214.0.0/16", "iijmio.jp", 2),
                    (4230, "200.189.0.0/16", "claro.com.br", 1),
                    (4230, "200.189.0.0/16", "embratel.com.br", 2)
                ])
            conn.commit()

    def consultar(self, asn: int, prefixo: str, pais: str):
        """
        Executa a consulta exigida na Tarefa 5:
        Retorna Top Domínios, Siblings e IXPs.
        """
        resultado = {
            "asn_consultado": f"AS{asn}",
            "prefixo_consultado": prefixo,
            "pais_consultado": pais,
            "org_name": "N/A",
            "siblings": [],
            "ixps": [],
            "top_domains": []
        }

        with self._get_connection() as conn:
            cursor = conn.cursor()

            # a) Identificar a Organização do AS
            cursor.execute("SELECT org_name FROM asns WHERE asn = ?;", (asn,))
            row = cursor.fetchone()
            if not row:
                return {"erro": f"ASN {asn} não encontrado na base local."}
            
            org_name = row[0]
            resultado["org_name"] = org_name

            # b) Buscar Siblings (outros ASNs pertencentes à mesma Organização)
            cursor.execute(
                "SELECT asn FROM asns WHERE org_name = ? AND asn != ?;", 
                (org_name, asn)
            )
            resultado["siblings"] = [f"AS{r[0]}" for r in cursor.fetchall()]

            # c) Buscar IXPs onde o AS está presente
            cursor.execute(
                "SELECT ixp_name, country FROM asn_ixps WHERE asn = ?;", 
                (asn,)
            )
            resultado["ixps"] = [{"nome": r[0], "pais": r[1]} for r in cursor.fetchall()]

            # d) Buscar Top Domínios associados ao ASN e Prefixo
            cursor.execute(
                "SELECT domain, rank FROM top_domains WHERE asn = ? AND prefix = ? ORDER BY rank ASC;", 
                (asn, prefixo)
            )
            resultado["top_domains"] = [{"domain": r[0], "rank": r[1]} for r in cursor.fetchall()]

        return resultado


# --- INTERFACE DE LINHA DE COMANDO (CLI) ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Serviço de Consulta Local do Internet Yellow Pages (IYP)")
    parser.add_argument("--asn", type=int, default=2497, help="Número do ASN (ex: 2497)")
    parser.add_argument("--prefixo", type=str, default="202.214.0.0/16", help="Prefixo IP (ex: 202.214.0.0/16)")
    parser.add_argument("--pais", type=str, default="JP", help="Código do País (ex: JP ou BR)")

    args = parser.parse_args()

    servico = ServicoIYPLocal()
    resposta = servico.consultar(asn=args.asn, prefixo=args.prefixo, pais=args.pais)

    print("\n================ RESULTADO DA CONSULTA IYP ================")
    print(json.dumps(resposta, indent=4, ensure_ascii=False))
    print("===========================================================\n")