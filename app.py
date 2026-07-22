import webview
import json
import os
from pathlib import Path
import base64
import time
import shutil

# Essayer d'importer pypresence pour Discord
try:
    from pypresence import Presence
    DISCORD_AVAILABLE = True
    CLIENT_ID = '1529231932313833562'  # À remplacer par ton ID d'application Discord
except ImportError:
    DISCORD_AVAILABLE = False
    print("Discord Rich Presence non disponible.")

# Dossier de stockage dans AppData/Roaming
app_data_folder = Path.home() / "AppData" / "Roaming" / "PuzzleForge"
app_data_folder.mkdir(parents=True, exist_ok=True)
library_file = app_data_folder / "library.json"
settings_file = app_data_folder / "settings.json"

class Api:
    def __init__(self):
        self.rpc = None
        self.discord_enabled = self.load_settings().get('discord_enabled', True)
        if DISCORD_AVAILABLE and self.discord_enabled:
            self.connect_discord()

    def connect_discord(self):
        """Connecte à Discord Rich Presence"""
        try:
            self.rpc = Presence(CLIENT_ID)
            self.rpc.connect()
            self.update_discord_presence()
        except Exception as e:
            print(f"Erreur connexion Discord: {e}")
            self.rpc = None

    def disconnect_discord(self):
        """Déconnecte Discord"""
        if self.rpc:
            try:
                self.rpc.close()
                self.rpc = None
            except:
                pass

    def update_discord_presence(self):
        """Met à jour la présence Discord"""
        if self.rpc:
            try:
                self.rpc.update(
                    large_image="puzzleforge_logo",
                    large_text="PuzzleForge v1.0.5",
                    start=int(time.time())
                )
            except Exception as e:
                print(f"Erreur update Discord: {e}")

    def load_settings(self):
        """Charge les paramètres"""
        try:
            if settings_file.exists():
                with open(settings_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return {'discord_enabled': True}
        except Exception as e:
            print(f"Erreur load_settings: {e}")
            return {'discord_enabled': True}

    def save_settings(self, settings):
        """Sauvegarde les paramètres"""
        try:
            with open(settings_file, 'w', encoding='utf-8') as f:
                json.dump(settings, f, ensure_ascii=False, indent=2)
            return {"success": True}
        except Exception as e:
            print(f"Erreur save_settings: {e}")
            return {"success": False, "error": str(e)}

    def toggle_discord(self, enabled):
        """Active/désactive Discord"""
        self.discord_enabled = enabled
        settings = self.load_settings()
        settings['discord_enabled'] = enabled
        self.save_settings(settings)
        
        if enabled and DISCORD_AVAILABLE:
            self.connect_discord()
        else:
            self.disconnect_discord()
        
        return {"success": True}

    def get_library_stats(self):
        """Retourne les statistiques de la bibliothèque"""
        try:
            library = self.load_library()
            image_count = len(library)
            total_size = 0
            
            for item in library:
                image_path = app_data_folder / item.get('image', '')
                if image_path.exists():
                    total_size += image_path.stat().st_size
            
            # Convertir en MB
            size_mb = total_size / (1024 * 1024)
            
            return {
                "success": True,
                "count": image_count,
                "size_mb": round(size_mb, 2)
            }
        except Exception as e:
            print(f"Erreur get_library_stats: {e}")
            return {"success": False, "error": str(e)}

    def save_puzzle(self, name, image_data, difficulty):
        """Sauvegarde un puzzle (image + métadonnées)"""
        try:
            puzzle_id = f"puzzle_{int(time.time() * 1000)}"
            image_path = app_data_folder / f"{puzzle_id}.jpg"
            
            # Décoder l'image base64
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            with open(image_path, 'wb') as f:
                f.write(base64.b64decode(image_data))
            
            # Charger la bibliothèque existante
            library = self.load_library()
            
            # Ajouter la nouvelle entrée
            entry = {
                "id": puzzle_id,
                "name": name,
                "difficulty": difficulty,
                "date": __import__('datetime').datetime.now().strftime('%d/%m/%Y'),
                "image": puzzle_id + ".jpg"
            }
            library.insert(0, entry)
            
            # Sauvegarder la bibliothèque
            with open(library_file, 'w', encoding='utf-8') as f:
                json.dump(library, f, ensure_ascii=False, indent=2)
            
            return {"success": True, "id": puzzle_id}
        except Exception as e:
            print(f"Erreur save_puzzle: {e}")
            return {"success": False, "error": str(e)}
    
    def load_library(self):
        """Charge la bibliothèque"""
        try:
            if library_file.exists():
                with open(library_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return []
        except Exception as e:
            print(f"Erreur load_library: {e}")
            return []
    
    def load_puzzle_image(self, puzzle_id):
        """Charge une image de puzzle"""
        try:
            image_path = app_data_folder / f"{puzzle_id}.jpg"
            if image_path.exists():
                with open(image_path, 'rb') as f:
                    image_data = base64.b64encode(f.read()).decode()
                return f"data:image/jpeg;base64,{image_data}"
            return None
        except Exception as e:
            print(f"Erreur load_puzzle_image: {e}")
            return None
    
    def delete_puzzle(self, puzzle_id):
        """Supprime un puzzle"""
        try:
            image_path = app_data_folder / f"{puzzle_id}.jpg"
            if image_path.exists():
                image_path.unlink()
            
            library = self.load_library()
            library = [p for p in library if p["id"] != puzzle_id]
            
            with open(library_file, 'w', encoding='utf-8') as f:
                json.dump(library, f, ensure_ascii=False, indent=2)
            
            return {"success": True}
        except Exception as e:
            print(f"Erreur delete_puzzle: {e}")
            return {"success": False, "error": str(e)}
    
    def close_discord(self):
        """Ferme la connexion Discord"""
        if self.rpc:
            try:
                self.rpc.close()
            except:
                pass

# Créer l'API
api = Api()

# Créer et afficher la fenêtre
window = webview.create_window(
    title='PuzzleForge 1.0.5',
    url='index.html',
    width=1200,
    height=800,
    resizable=True,
    background_color='#0b0d12',
    js_api=api
)

try:
    webview.start()
finally:
    api.close_discord()