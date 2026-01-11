import time
import subprocess

POLL_SECONDS = 20

if __name__ == "__main__":
    print("👀 MONGO AUTO-INGEST WORKER STARTED")
    print("   🔄 Polling Mongo for pending memories")
    print("---------------------------------------------------")

    while True:
        try:
            subprocess.run(["python", "./ingest_memories.py"], check=True)
        except subprocess.CalledProcessError:
            print("❌ Error during mongo ingest. Check ingest_memories.py")
        time.sleep(POLL_SECONDS)
