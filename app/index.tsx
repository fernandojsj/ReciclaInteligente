import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { classificarImagem } from '../services/gemini';

// Diz pro TypeScript o formato da resposta do Gemini
interface Resultado {
  objeto: string;
  lixeira: string;
  material: string;
  preparo: string;
  reciclavel: boolean;
}

export default function HomeScreen() {
  const [pontos, setPontos] = useState(1250);
  const [permission, requestPermission] = useCameraPermissions();
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const cameraRef = useRef<CameraView>(null);

  async function tirarFoto() {
    if (!cameraRef.current) return;

    try {
      setCarregando(true);
      setResultado(null);

      // Tira a foto e pega o base64
      const foto = await cameraRef.current.takePictureAsync({ base64: true });

      // Envia pro Gemini e espera a resposta
      if (!foto.base64) return;
      const analise = await classificarImagem(foto.base64);

      // Salva o resultado e adiciona pontos
      setResultado(analise);
      if (analise.reciclavel) {
        setPontos(p => p + 15);
      }

    } catch (erro) {
      console.error('Erro ao classificar:', erro);
    } finally {
      setCarregando(false);
    }
  }

  function confirmarDescarte() {
    setResultado(null);
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.instrucao}>Precisamos de acesso à câmera</Text>
        <TouchableOpacity style={styles.botaoPermissao} onPress={requestPermission}>
          <Text style={styles.botaoTexto}>Permitir câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.appNome}>Recicla Inteligente</Text>
        <View style={styles.avatarArea}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetra}>U</Text>
          </View>
          <Text style={styles.pontos}>{pontos} pts</Text>
        </View>
      </View>

      {/* Câmera */}
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing="back" ref={cameraRef} />
      </View>

      {/* Botão de captura */}
      {!resultado && (
        <View style={styles.fabContainer}>
          <TouchableOpacity style={styles.fab} onPress={tirarFoto} disabled={carregando}>
            {carregando
              ? <ActivityIndicator color="white" />
              : <Text style={styles.fabIcone}>📷</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Card de resultado */}
      {resultado && (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.resultadoRow}>
            <Text style={styles.lixeiraIcone}>🗑️</Text>
            <View>
              <Text style={styles.resultadoLabel}>Objeto Identificado</Text>
              <Text style={styles.resultadoObjeto}>{resultado.objeto}</Text>
              <Text style={styles.resultadoLixeira}>
                Lixeira {resultado.lixeira} — {resultado.material}
              </Text>
            </View>
          </View>

          <View style={styles.preparoCard}>
            <Text style={styles.preparoTexto}>💧 {resultado.preparo}</Text>
          </View>

          {resultado.reciclavel && (
            <Text style={styles.pontosGanhos}>+15 Pontos Ganhos!</Text>
          )}

          <TouchableOpacity style={styles.botaoConfirmar} onPress={confirmarDescarte}>
            <Text style={styles.botaoTexto}>Confirmei o Descarte!</Text>
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f0',
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f0',
    zIndex: 10,
  },
  appNome: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a3a2a',
  },
  avatarArea: { alignItems: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2ea96a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetra: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  pontos: { fontSize: 11, color: '#2ea96a', fontWeight: '600', marginTop: 2 },
  cameraContainer: { flex: 1, overflow: 'hidden' },
  camera: { flex: 1 },
  fabContainer: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2ea96a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcone: { fontSize: 28 },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 32,
    height: 3,
    backgroundColor: '#d0d8d2',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  resultadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  lixeiraIcone: { fontSize: 48 },
  resultadoLabel: { fontSize: 10, color: '#8fa498', fontWeight: '600', textTransform: 'uppercase' },
  resultadoObjeto: { fontSize: 16, fontWeight: 'bold', color: '#1a3a2a' },
  resultadoLixeira: { fontSize: 13, color: '#e0401a', fontWeight: '500', marginTop: 2 },
  preparoCard: {
    backgroundColor: '#edf7f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  preparoTexto: { fontSize: 13, color: '#2a6048', fontWeight: '500' },
  pontosGanhos: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ea96a',
    textAlign: 'center',
    marginBottom: 14,
  },
  botaoConfirmar: {
    backgroundColor: '#1a7a55',
    padding: 16,
    borderRadius: 14,
  },
  botaoPermissao: {
    backgroundColor: '#2ea96a',
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 40,
  },
  botaoTexto: { color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 15 },
  instrucao: { fontSize: 14, color: '#8fa498', textAlign: 'center', marginBottom: 20 },
});