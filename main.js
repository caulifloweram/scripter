const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
const AUTOSAVE_DIR = path.join(os.homedir(), 'Documents', 'Script Writer Autosaves');

// Ensure autosave directory exists
function ensureAutosaveDir() {
  if (!fs.existsSync(AUTOSAVE_DIR)) {
    fs.mkdirSync(AUTOSAVE_DIR, { recursive: true });
  }
}

// Clean old autosave files (keep last 50 versions)
function cleanOldAutosaves() {
  try {
    const files = fs.readdirSync(AUTOSAVE_DIR)
      .filter(f => f.startsWith('autosave_') && f.endsWith('.txt'))
      .map(f => ({
        name: f,
        path: path.join(AUTOSAVE_DIR, f),
        time: fs.statSync(path.join(AUTOSAVE_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Keep only the 50 most recent
    if (files.length > 50) {
      files.slice(50).forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
  } catch (error) {
    console.error('Error cleaning old autosaves:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    title: 'Script Writer'
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in development (comment out for production)
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  ensureAutosaveDir();
  cleanOldAutosaves();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle save file dialog
ipcMain.handle('save-file', async (event, content) => {
  const { dialog } = require('electron');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Script',
    defaultPath: `script_${new Date().toISOString().slice(0, 10)}.txt`,
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, content, 'utf8');
      return { success: true, path: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, canceled: true };
});

// Handle autosave
ipcMain.handle('autosave', async (event, content, backgroundMode) => {
  try {
    ensureAutosaveDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `autosave_${timestamp}.txt`;
    const filepath = path.join(AUTOSAVE_DIR, filename);
    
    fs.writeFileSync(filepath, content, 'utf8');
    
    // Also save preferences
    const prefsPath = path.join(AUTOSAVE_DIR, 'preferences.json');
    fs.writeFileSync(prefsPath, JSON.stringify({
      backgroundMode: backgroundMode,
      lastAutosave: timestamp
    }), 'utf8');
    
    cleanOldAutosaves();
    
    return { success: true, path: filepath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get autosave directory path
ipcMain.handle('get-autosave-dir', () => {
  return AUTOSAVE_DIR;
});

// Open autosave folder
ipcMain.handle('open-autosave-folder', () => {
  ensureAutosaveDir();
  shell.openPath(AUTOSAVE_DIR);
  return { success: true };
});

// Load last autosave
ipcMain.handle('load-last-autosave', () => {
  try {
    ensureAutosaveDir();
    const files = fs.readdirSync(AUTOSAVE_DIR)
      .filter(f => f.startsWith('autosave_') && f.endsWith('.txt'))
      .map(f => ({
        name: f,
        path: path.join(AUTOSAVE_DIR, f),
        time: fs.statSync(path.join(AUTOSAVE_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 0) {
      const content = fs.readFileSync(files[0].path, 'utf8');
      
      // Load preferences
      let backgroundMode = 'light';
      const prefsPath = path.join(AUTOSAVE_DIR, 'preferences.json');
      if (fs.existsSync(prefsPath)) {
        try {
          const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
          backgroundMode = prefs.backgroundMode || 'light';
        } catch (e) {
          // Ignore pref errors
        }
      }
      
      return { success: true, content, backgroundMode };
    }
    return { success: false, noFiles: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Save file with custom name to autosave directory
ipcMain.handle('save-file-to-dir', async (event, content, filename) => {
  try {
    ensureAutosaveDir();
    // Ensure filename ends with .txt
    if (!filename.endsWith('.txt')) {
      filename += '.txt';
    }
    const filepath = path.join(AUTOSAVE_DIR, filename);
    fs.writeFileSync(filepath, content, 'utf8');
    return { success: true, path: filepath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// List all autosave files (including saved files)
ipcMain.handle('list-autosave-files', () => {
  try {
    ensureAutosaveDir();
    const files = fs.readdirSync(AUTOSAVE_DIR)
      .filter(f => f.endsWith('.txt') && f !== 'preferences.json')
      .map(f => {
        const filePath = path.join(AUTOSAVE_DIR, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          time: stats.mtime.getTime(),
          date: stats.mtime.toLocaleString()
        };
      })
      .sort((a, b) => b.time - a.time);

    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message, files: [] };
  }
});

// Load specific autosave file
ipcMain.handle('load-autosave-file', async (event, filepath) => {
  try {
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf8');
      return { success: true, content };
    }
    return { success: false, error: 'File not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

