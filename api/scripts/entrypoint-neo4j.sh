#!/bin/bash
set -e

DUMP_DIR="/data/dumps"
FLAG_FILE="$DUMP_DIR/needs_reload"
DB_NAME="neo4j"

echo "=== [IYP-Init] Checando necessidade de restauração do Neo4j ==="

if [ -f "$FLAG_FILE" ]; then
    echo "=== [IYP-Init] Novo dump detectado! Preparando carga no Neo4j... ==="
    
    # Procura o arquivo .dump original (ex: iyp_latest.dump)
    DUMP_FILE=$(ls $DUMP_DIR/*.dump 2>/dev/null | head -n 1)
    
    if [ -n "$DUMP_FILE" ]; then
        echo "=== [IYP-Init] Arquivo encontrado: $DUMP_FILE ==="
        
        # 1. Garante que o banco de dados antigo seja limpo antes da carga
        rm -rf /data/databases/$DB_NAME /data/transactions/$DB_NAME
        
        # 2. Executa a carga especificando o arquivo diretamente via --from-path
        echo "=== [IYP-Init] Executando neo4j-admin database load... ==="
        neo4j-admin database load $DB_NAME --from-path="$DUMP_DIR" --overwrite-destination=true || true
        
        # Se falhou por causa do nome do arquivo, tenta renomear explicitamente para neo4j.dump
        if [ ! -d "/data/databases/$DB_NAME" ]; then
            echo "=== [IYP-Init] Tentando carga via renomeação estática para neo4j.dump... ==="
            cp "$DUMP_FILE" "$DUMP_DIR/neo4j.dump"
            neo4j-admin database load $DB_NAME --from-path="$DUMP_DIR" --overwrite-destination=true
            rm -f "$DUMP_DIR/neo4j.dump"
        fi
        
        rm -f "$FLAG_FILE"
        echo "=== [IYP-Init] Carga do Neo4j concluída! ==="
    else
        echo "=== [IYP-Init] ERRO: Nenhum arquivo .dump encontrado em $DUMP_DIR ==="
    fi
else
    echo "=== [IYP-Init] Nenhuma atualização necessária. Iniciando Neo4j... ==="
fi

exec /startup/docker-entrypoint.sh neo4j