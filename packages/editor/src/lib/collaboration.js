import { io } from 'socket.io-client';

/**
 * Système de collaboration en temps réel avec Socket.io
 */
export class CollaborationManager {
  constructor(options = {}) {
    this.socket = null;
    this.projectId = null;
    this.userId = null;
    this.cursors = new Map();
    this.isConnected = false;
    
    this.options = {
      serverUrl: options.serverUrl || 'http://localhost:3001',
      autoConnect: options.autoConnect !== false,
      ...options
    };
    
    this.callbacks = {
      onConnect: options.onConnect || (() => {}),
      onDisconnect: options.onDisconnect || (() => {}),
      onUserJoined: options.onUserJoined || (() => {}),
      onUserLeft: options.onUserLeft || (() => {}),
      onCursorMove: options.onCursorMove || (() => {}),
      onCodeChange: options.onCodeChange || (() => {}),
      onError: options.onError || (() => {})
    };

    if (this.options.autoConnect) {
      this.connect();
    }
  }

  /**
   * Se connecte au serveur Socket.io
   */
  connect() {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(this.options.serverUrl, {
      transports: ['websocket', 'polling']
    });

    this.setupSocketListeners();
  }

  /**
   * Configure les écouteurs Socket.io
   */
  setupSocketListeners() {
    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connecté au serveur de collaboration');
      this.callbacks.onConnect();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Déconnecté du serveur de collaboration');
      this.callbacks.onDisconnect();
    });

    this.socket.on('user-joined', (data) => {
      console.log('Utilisateur rejoint:', data.user);
      this.callbacks.onUserJoined(data.user);
    });

    this.socket.on('user-left', (data) => {
      console.log('Utilisateur quitté:', data.userId);
      this.cursors.delete(data.userId);
      this.callbacks.onUserLeft(data.userId);
    });

    this.socket.on('cursor-moved', (data) => {
      this.cursors.set(data.userId, {
        position: data.position,
        selection: data.selection,
        user: data.user
      });
      this.callbacks.onCursorMove(data);
    });

    this.socket.on('code-changed', (data) => {
      this.callbacks.onCodeChange(data);
    });

    this.socket.on('error', (error) => {
      console.error('Erreur de collaboration:', error);
      this.callbacks.onError(error);
    });
  }

  /**
   * Rejoint un projet pour collaboration
   */
  joinProject(projectId, user) {
    if (!this.isConnected) {
      console.warn('Pas encore connecté au serveur');
      return;
    }

    this.projectId = projectId;
    this.userId = user.id;

    this.socket.emit('join-project', {
      projectId,
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        color: user.color || this.generateUserColor()
      }
    });
  }

  /**
   * Quitte le projet actuel
   */
  leaveProject() {
    if (this.projectId && this.isConnected) {
      this.socket.emit('leave-project', {
        projectId: this.projectId,
        userId: this.userId
      });
    }

    this.projectId = null;
    this.userId = null;
    this.cursors.clear();
  }

  /**
   * Envoie la position du curseur
   */
  sendCursorPosition(position, selection = null) {
    if (!this.isConnected || !this.projectId) return;

    this.socket.emit('cursor-move', {
      projectId: this.projectId,
      userId: this.userId,
      position,
      selection
    });
  }

  /**
   * Envoie les changements de code
   */
  sendCodeChange(change) {
    if (!this.isConnected || !this.projectId) return;

    this.socket.emit('code-change', {
      projectId: this.projectId,
      userId: this.userId,
      change: {
        filename: change.filename,
        content: change.content,
        range: change.range,
        operation: change.operation, // 'insert', 'delete', 'replace'
        timestamp: Date.now()
      }
    });
  }

  /**
   * Envoie un message de chat
   */
  sendChatMessage(message) {
    if (!this.isConnected || !this.projectId) return;

    this.socket.emit('chat-message', {
      projectId: this.projectId,
      userId: this.userId,
      message: {
        content: message,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Génère une couleur unique pour l'utilisateur
   */
  generateUserColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Obtient tous les curseurs actifs
   */
  getCursors() {
    return Array.from(this.cursors.entries()).map(([userId, data]) => ({
      userId,
      ...data
    }));
  }

  /**
   * Se déconnecte complètement
   */
  disconnect() {
    this.leaveProject();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
  }
}

/**
 * Intégration avec Monaco Editor pour la collaboration
 */
export class MonacoCollaboration {
  constructor(editor, collaborationManager) {
    this.editor = editor;
    this.collaboration = collaborationManager;
    this.cursorDecorations = new Map();
    this.isUpdatingFromRemote = false;
    
    this.setupEditorListeners();
    this.setupCollaborationListeners();
  }

  /**
   * Configure les écouteurs de l'éditeur
   */
  setupEditorListeners() {
    // Écouter les changements de position du curseur
    this.editor.onDidChangeCursorPosition((e) => {
      if (!this.isUpdatingFromRemote) {
        this.collaboration.sendCursorPosition({
          lineNumber: e.position.lineNumber,
          column: e.position.column
        }, this.getSelection());
      }
    });

    // Écouter les changements de sélection
    this.editor.onDidChangeCursorSelection((e) => {
      if (!this.isUpdatingFromRemote) {
        this.collaboration.sendCursorPosition(
          {
            lineNumber: e.selection.startLineNumber,
            column: e.selection.startColumn
          },
          {
            startLineNumber: e.selection.startLineNumber,
            startColumn: e.selection.startColumn,
            endLineNumber: e.selection.endLineNumber,
            endColumn: e.selection.endColumn
          }
        );
      }
    });

    // Écouter les changements de contenu
    this.editor.onDidChangeModelContent((e) => {
      if (!this.isUpdatingFromRemote) {
        e.changes.forEach(change => {
          this.collaboration.sendCodeChange({
            filename: this.getCurrentFilename(),
            content: this.editor.getValue(),
            range: change.range,
            operation: this.getOperationType(change)
          });
        });
      }
    });
  }

  /**
   * Configure les écouteurs de collaboration
   */
  setupCollaborationListeners() {
    this.collaboration.callbacks.onCursorMove = (data) => {
      this.updateRemoteCursor(data);
    };

    this.collaboration.callbacks.onCodeChange = (data) => {
      this.applyRemoteChange(data.change);
    };

    this.collaboration.callbacks.onUserLeft = (userId) => {
      this.removeUserCursor(userId);
    };
  }

  /**
   * Met à jour le curseur d'un utilisateur distant
   */
  updateRemoteCursor(data) {
    const { userId, position, selection, user } = data;
    
    const decorations = [];
    
    // Curseur principal
    decorations.push({
      range: {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column + 1
      },
      options: {
        className: 'remote-cursor',
        glyphMarginClassName: 'remote-cursor-glyph',
        stickiness: 1,
        afterContentClassName: 'remote-cursor-label',
        after: {
          content: user.name,
          backgroundColor: user.color,
          color: '#ffffff'
        }
      }
    });

    // Sélection si elle existe
    if (selection && (
      selection.startLineNumber !== selection.endLineNumber || 
      selection.startColumn !== selection.endColumn
    )) {
      decorations.push({
        range: selection,
        options: {
          className: 'remote-selection',
          backgroundColor: user.color + '30' // 30 = opacity
        }
      });
    }

    // Mettre à jour les décorations
    const oldDecorations = this.cursorDecorations.get(userId) || [];
    const newDecorations = this.editor.deltaDecorations(oldDecorations, decorations);
    this.cursorDecorations.set(userId, newDecorations);
  }

  /**
   * Applique un changement distant au code
   */
  applyRemoteChange(change) {
    this.isUpdatingFromRemote = true;
    
    try {
      // Appliquer le changement basé sur l'opération
      switch (change.operation) {
        case 'replace':
          this.editor.setValue(change.content);
          break;
        case 'insert':
          this.editor.executeEdits('remote-edit', [{
            range: change.range,
            text: change.content,
            forceMoveMarkers: true
          }]);
          break;
        case 'delete':
          this.editor.executeEdits('remote-edit', [{
            range: change.range,
            text: '',
            forceMoveMarkers: true
          }]);
          break;
      }
    } catch (error) {
      console.error('Erreur lors de l\'application du changement distant:', error);
    } finally {
      this.isUpdatingFromRemote = false;
    }
  }

  /**
   * Supprime le curseur d'un utilisateur
   */
  removeUserCursor(userId) {
    const decorations = this.cursorDecorations.get(userId);
    if (decorations) {
      this.editor.deltaDecorations(decorations, []);
      this.cursorDecorations.delete(userId);
    }
  }

  /**
   * Obtient la sélection actuelle
   */
  getSelection() {
    const selection = this.editor.getSelection();
    return {
      startLineNumber: selection.startLineNumber,
      startColumn: selection.startColumn,
      endLineNumber: selection.endLineNumber,
      endColumn: selection.endColumn
    };
  }

  /**
   * Obtient le nom du fichier actuel
   */
  getCurrentFilename() {
    const model = this.editor.getModel();
    return model ? model.uri.path.split('/').pop() : 'untitled.svelte';
  }

  /**
   * Détermine le type d'opération basé sur un changement
   */
  getOperationType(change) {
    if (change.text === '') {
      return 'delete';
    } else if (change.rangeLength === 0) {
      return 'insert';
    } else {
      return 'replace';
    }
  }

  /**
   * Nettoie les ressources
   */
  destroy() {
    // Supprimer toutes les décorations de curseur
    for (const [userId, decorations] of this.cursorDecorations) {
      this.editor.deltaDecorations(decorations, []);
    }
    this.cursorDecorations.clear();
  }
}