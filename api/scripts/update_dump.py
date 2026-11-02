import os
import json
import urllib.request
from pathlib import Path

DUMP_URL = os.getenv("IYP_DUMP_URL", "https://iyp.iijlab.net/dumps/latest.dump")
DUMP_DIR = Path("/data/dumps")
META_FILE = DUMP_DIR / "dump_meta.json"
TARGET_DUMP = DUMP_DIR / "iyp_latest.dump"
FLAG_FILE = DUMP_DIR / "needs_reload"

def get_remote_metadata(url: str) -> dict:
    req = urllib.request.Request(url, method='HEAD')
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            headers = resp.info()
            return {
                "etag": headers.get("ETag", "").strip('"'),
                "last_modified": headers.get("Last-Modified", "")
            }
    except Exception as e:
        print(f"[IYP-Updater] Erro ao consultar metadados remotos: {e}")
        return {}

def load_local_metadata() -> dict:
    if META_FILE.exists():
        try:
            with open(META_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_local_metadata(meta: dict):
    DUMP_DIR.mkdir(parents=True, exist_ok=True)
    with open(META_FILE, 'w') as f:
        json.dump(meta, f, indent=2)

def download_dump(url: str, destination: Path):
    print(f"[IYP-Updater] Baixando novo dump de {url}...")
    DUMP_DIR.mkdir(parents=True, exist_ok=True)
    temp_file = destination.with_suffix('.tmp')
    urllib.request.urlretrieve(url, temp_file)
    temp_file.replace(destination)
    print(f"[IYP-Updater] Download concluído: {destination}")

def check_and_update():
    remote_meta = get_remote_metadata(DUMP_URL)
    local_meta = load_local_metadata()

    if not remote_meta:
        print("[IYP-Updater] Sem resposta remota. Mantendo banco atual.")
        return

    remote_tag = remote_meta.get("etag") or remote_meta.get("last_modified")
    local_tag = local_meta.get("etag") or local_meta.get("last_modified")

    if not TARGET_DUMP.exists() or remote_tag != local_tag:
        print(f"[IYP-Updater] Nova versão detectada! (Remoto: {remote_tag} | Local: {local_tag})")
        download_dump(DUMP_URL, TARGET_DUMP)
        save_local_metadata(remote_meta)
        FLAG_FILE.touch()
        print("[IYP-Updater] Flag 'needs_reload' criada para o Neo4j.")
    else:
        print("[IYP-Updater] O dump do Neo4j já está na versão mais recente.")

if __name__ == "__main__":
    check_and_update()