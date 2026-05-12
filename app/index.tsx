import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { classificarImagem, verificarDescarte } from '../services/gemini';
import { carregarPontos, salvarPontos, adicionarAoHistorico } from '../services/storage';
import { COR_LIXEIRA } from '../constants/lixeiras';
import { LixeiraIcon } from '../components/LixeiraIcon';
import { useTheme } from '../context/ThemeContext';
import type { Cores } from '../context/ThemeContext';
import type { Resultado } from '../types';

const { height: SCREEN_H } = Dimensions.get('window');

const CONFIANCA_COR = { alta: '#1aff8c', media: '#ffd700', baixa: '#ff4d6d' };
const CONFIANCA_LABEL = { alta: '✓  Alta precisão', media: '~  Precisão média', baixa: '⚠  Baixa precisão — verifique o item' };

export default function ScannerScreen() {
  const { C, modo, toggleModo } = useTheme();
  const styles = useMemo(() => makeStyles(C), [modo]);

  const [pontos, setPontos] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [aguardandoVerificacao, setAguardandoVerificacao] = useState(false);
  const [verificandoAI, setVerificandoAI] = useState(false);
  const [verificacaoOk, setVerificacaoOk] = useState<boolean | null>(null);
  const [motivoVerificacao, setMotivoVerificacao] = useState('');
  const cameraRef = useRef<CameraView>(null);

  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0.45)).current;
  const scanLine = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => {
    carregarPontos().then(setPontos);
  }, []));

  useEffect(() => {
    const makeLoop = (anim: Animated.Value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1, useNativeDriver: true }),
        ])
      );
    const a1 = makeLoop(ring1);
    const a2 = makeLoop(ring2);
    a1.start();
    a2.start();
    return () => { a1.stop(); a2.stop(); };
  }, []);

  useEffect(() => {
    if (carregando || verificandoAI) {
      scanLine.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLine, { toValue: 1, duration: 1400, useNativeDriver: true }),
          Animated.timing(scanLine, { toValue: 0, duration: 1, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scanLine.stopAnimation();
      scanLine.setValue(0);
    }
  }, [carregando, verificandoAI]);

  useEffect(() => {
    if (resultado) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 68, friction: 13, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(SCREEN_H);
      fadeAnim.setValue(0);
    }
  }, [resultado]);

  async function tirarFoto() {
    if (!cameraRef.current) return;
    setErro(null);
    try {
      setCarregando(true);
      setResultado(null);
      const foto = await cameraRef.current.takePictureAsync({ base64: true });
      if (!foto?.base64) return;
      setFotoUri(foto.uri);
      const analise = await classificarImagem(foto.base64);
      setResultado(analise);
    } catch (e: any) {
      const detalhe = e?.response?.data?.error?.message ?? e?.message ?? 'Erro desconhecido';
      setErro(`Erro: ${detalhe}`);
      console.error('ERRO GEMINI:', JSON.stringify(e?.response?.data ?? e?.message));
    } finally {
      setCarregando(false);
    }
  }

  function irDescartar() {
    setFotoUri(null);
    setAguardandoVerificacao(true);
  }

  async function tirarFotoVerificacao() {
    if (!cameraRef.current || !resultado) return;
    setErro(null);
    try {
      setVerificandoAI(true);
      const foto = await cameraRef.current.takePictureAsync({ base64: true });
      if (!foto?.base64) return;
      setFotoUri(foto.uri);

      const verificacao = await verificarDescarte(foto.base64, resultado.objeto, resultado.lixeira);
      setAguardandoVerificacao(false);
      setVerificacaoOk(verificacao.confirmado);
      setMotivoVerificacao(verificacao.motivo);

      if (verificacao.confirmado) {
        const pts = resultado.reciclavel ? 15 : 0;
        if (pts > 0) {
          const novo = pontos + pts;
          setPontos(novo);
          await salvarPontos(novo);
        }
        await adicionarAoHistorico({
          ...resultado,
          id: Date.now().toString(),
          timestamp: Date.now(),
          pontosGanhos: pts,
        });
      }
    } catch (e: any) {
      setAguardandoVerificacao(false);
      setErro('Erro ao verificar. Tente novamente.');
    } finally {
      setVerificandoAI(false);
    }
  }

  function resetar() {
    setResultado(null);
    setFotoUri(null);
    setErro(null);
    setAguardandoVerificacao(false);
    setVerificandoAI(false);
    setVerificacaoOk(null);
    setMotivoVerificacao('');
  }

  function tentarNovamente() {
    setVerificacaoOk(null);
    setFotoUri(null);
    setMotivoVerificacao('');
    setAguardandoVerificacao(true);
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>Câmera necessária</Text>
        <Text style={styles.permSub}>Para escanear e classificar resíduos com IA</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.8}>
          <Text style={styles.permBtnText}>Permitir Câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const corHex = resultado
    ? (COR_LIXEIRA[resultado.lixeira.toLowerCase()] ?? '#616161')
    : C.primary;

  const scanLineY = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 220],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTag}>RECICLA</Text>
          <Text style={styles.appName}>Inteligente</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity style={styles.themeToggle} onPress={toggleModo} activeOpacity={0.8}>
            <Ionicons
              name={modo === 'dark' ? 'sunny-outline' : 'moon-outline'}
              size={18}
              color={C.primary}
            />
          </TouchableOpacity>
          <View style={styles.ptsBadge}>
            <Text style={styles.ptsValue}>{pontos}</Text>
            <Text style={styles.ptsLabel}> pts</Text>
          </View>
        </View>
      </View>

      {/* Camera / Foto congelada */}
      <View style={styles.cameraWrap}>
        {fotoUri ? (
          <Image source={{ uri: fotoUri }} style={styles.camera} resizeMode="cover" />
        ) : (
          <CameraView style={styles.camera} facing="back" ref={cameraRef} />
        )}

        {/* Reticle — modo scan inicial */}
        {!fotoUri && !aguardandoVerificacao && (
          <View style={styles.reticle} pointerEvents="none">
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
        )}

        {/* Reticle — modo verificação de descarte */}
        {!fotoUri && aguardandoVerificacao && resultado && (
          <View style={styles.reticle} pointerEvents="none">
            <View style={[styles.corner, styles.tl, { borderColor: corHex }]} />
            <View style={[styles.corner, styles.tr, { borderColor: corHex }]} />
            <View style={[styles.corner, styles.bl, { borderColor: corHex }]} />
            <View style={[styles.corner, styles.br, { borderColor: corHex }]} />
            <View style={[styles.verifyHint, { backgroundColor: corHex + '22', borderColor: corHex + '50' }]}>
              <LixeiraIcon lixeira={resultado.lixeira} cor={corHex} size={44} />
              <View>
                <Text style={[styles.verifyHintTitle, { color: corHex }]}>Fotografe o descarte</Text>
                <Text style={styles.verifyHintSub}>Mostre o item na lixeira {resultado.lixeira}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Overlay — analisando primeira foto */}
        {fotoUri && carregando && (
          <View style={styles.analyzeOverlay} pointerEvents="none">
            <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineY }] }]} />
            <View style={styles.analyzeBox}>
              <ActivityIndicator color={C.primary} size="large" />
              <Text style={styles.analyzeText}>Analisando com IA...</Text>
            </View>
          </View>
        )}

        {/* Overlay — verificando segunda foto */}
        {fotoUri && verificandoAI && (
          <View style={[styles.analyzeOverlay, { backgroundColor: 'rgba(7,14,9,0.7)' }]} pointerEvents="none">
            <Animated.View style={[styles.scanLine, { backgroundColor: corHex, transform: [{ translateY: scanLineY }] }]} />
            <View style={styles.analyzeBox}>
              <ActivityIndicator color={corHex} size="large" />
              <Text style={[styles.analyzeText, { color: corHex }]}>Verificando descarte...</Text>
            </View>
          </View>
        )}
      </View>

      {/* Hint acima do botão */}
      {!resultado && !fotoUri && !carregando && !aguardandoVerificacao && (
        <Text style={styles.hintText}>Aponte para o objeto</Text>
      )}

      {/* Botão de captura */}
      {(!resultado || aguardandoVerificacao) && !fotoUri && (
        <View style={styles.btnWrap}>
          {!carregando && !verificandoAI && (
            <>
              <Animated.View style={[styles.ring, { backgroundColor: aguardandoVerificacao ? corHex : C.primary }, {
                opacity: ring1.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.45, 0.15, 0] }),
                transform: [{ scale: ring1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
              }]} />
              <Animated.View style={[styles.ring, { backgroundColor: aguardandoVerificacao ? corHex : C.primary }, {
                opacity: ring2.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.45, 0.15, 0] }),
                transform: [{ scale: ring2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
              }]} />
            </>
          )}
          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: aguardandoVerificacao ? corHex : C.primary }]}
            onPress={aguardandoVerificacao ? tirarFotoVerificacao : tirarFoto}
            disabled={carregando || verificandoAI}
            activeOpacity={0.82}
          >
            <Text style={styles.scanBtnIcon}>⬤</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Result card */}
      {resultado && !aguardandoVerificacao && (
        <Animated.View
          style={[
            styles.resultCard,
            { transform: [{ translateY: slideAnim }], opacity: fadeAnim, borderTopColor: corHex + '35' },
          ]}
        >
          <View style={styles.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.resultCardContent}
            keyboardShouldPersistTaps="handled"
          >
            {verificacaoOk !== null ? (
              verificacaoOk ? (
                <View style={styles.verifySuccess}>
                  <Text style={styles.verifySuccessIcon}>🎉</Text>
                  <Text style={styles.verifySuccessTitle}>Descarte confirmado!</Text>
                  {resultado.reciclavel && (
                    <View style={styles.verifyPtsRow}>
                      <Text style={styles.verifyPts}>+15 pts</Text>
                      <Text style={styles.verifyPtsSub}> adicionados ao saldo</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: C.primary, borderColor: C.primary, marginTop: 20 }]}
                    onPress={resetar}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.confirmText, { color: C.bg }]}>Escanear novo item</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.verifyFailure}>
                  <Text style={styles.verifyFailureIcon}>📷</Text>
                  <Text style={styles.verifyFailureTitle}>Descarte não identificado</Text>
                  <Text style={styles.verifyFailureSub}>{motivoVerificacao}</Text>
                  <View style={styles.verifyFailureBtns}>
                    <TouchableOpacity
                      style={[styles.confirmBtn, { flex: 1, backgroundColor: corHex + '15', borderColor: corHex }]}
                      onPress={tentarNovamente}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.confirmText, { color: corHex }]}>Tentar novamente</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmBtn, { flex: 1, borderColor: C.cardBorder, backgroundColor: 'transparent' }]}
                      onPress={resetar}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.confirmText, { color: C.textMuted }]}>Pular</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            ) : (
              <>
                <View style={styles.binRow}>
                  <LixeiraIcon lixeira={resultado.lixeira} cor={corHex} size={68} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.objName} numberOfLines={2}>{resultado.objeto}</Text>
                    <Text style={[styles.objMaterial, { color: corHex }]} numberOfLines={1}>
                      {resultado.material}
                    </Text>
                    <View style={[styles.confiancaBadge, { backgroundColor: CONFIANCA_COR[resultado.confianca] + '18', borderColor: CONFIANCA_COR[resultado.confianca] + '40' }]}>
                      <Text style={[styles.confiancaText, { color: CONFIANCA_COR[resultado.confianca] }]}>
                        {CONFIANCA_LABEL[resultado.confianca]}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={[styles.infoBox, { borderColor: corHex + '28', flex: 1 }]}>
                    <Text style={styles.infoLabel}>PREPARO</Text>
                    <Text style={styles.infoText}>💧 {resultado.preparo}</Text>
                  </View>
                  {resultado.dica ? (
                    <View style={[styles.infoBox, { borderColor: 'rgba(255,215,0,0.25)', flex: 1 }]}>
                      <Text style={styles.infoLabel}>DICA</Text>
                      <Text style={[styles.infoText, { color: 'rgba(255,215,0,0.75)' }]}>💡 {resultado.dica}</Text>
                    </View>
                  ) : null}
                </View>

                {resultado.reciclavel && (
                  <View style={styles.ptsPreview}>
                    <Text style={styles.ptsPreviewText}>🎁  +15 pts ao confirmar o descarte</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: corHex + '15', borderColor: corHex }]}
                  onPress={irDescartar}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.confirmText, { color: corHex }]}>
                    Ir descartar e confirmar  →
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.skipLink} onPress={resetar} activeOpacity={0.7}>
                  <Text style={styles.skipLinkText}>Pular verificação</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </Animated.View>
      )}

      {/* Error banner — após o resultCard para ficar na frente */}
      {erro && (
        <View style={styles.erroBanner}>
          <Text style={styles.erroText}>⚠️  {erro}</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(C: Cores) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    centered: { justifyContent: 'center', alignItems: 'center', padding: 32 },

    header: {
      paddingTop: 56,
      paddingHorizontal: 24,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    appTag: { fontSize: 9, fontWeight: '800', letterSpacing: 5, color: C.primary, marginBottom: 1 },
    appName: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
    themeToggle: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: C.primaryDim,
      borderWidth: 1,
      borderColor: C.primaryBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ptsBadge: {
      flexDirection: 'row',
      alignItems: 'baseline',
      backgroundColor: C.primaryDim,
      borderWidth: 1,
      borderColor: C.primaryBorder,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    ptsValue: { fontSize: 20, fontWeight: '900', color: C.primary },
    ptsLabel: { fontSize: 11, fontWeight: '700', color: C.primary, opacity: 0.65 },

    cameraWrap: { flex: 1, overflow: 'hidden' },
    camera: { flex: 1 },
    reticle: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    corner: { position: 'absolute', width: 20, height: 20, borderColor: C.primary, borderWidth: 2.5, opacity: 0.75 },
    tl: { top: 52, left: 52, borderBottomWidth: 0, borderRightWidth: 0 },
    tr: { top: 52, right: 52, borderBottomWidth: 0, borderLeftWidth: 0 },
    bl: { bottom: 84, left: 52, borderTopWidth: 0, borderRightWidth: 0 },
    br: { bottom: 84, right: 52, borderTopWidth: 0, borderLeftWidth: 0 },
    scanLine: {
      position: 'absolute',
      left: 52,
      right: 52,
      height: 1.5,
      backgroundColor: C.primary,
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 10,
      elevation: 6,
    },
    hintText: {
      position: 'absolute',
      bottom: 134,
      alignSelf: 'center',
      fontSize: 11,
      color: 'rgba(255,255,255,0.45)',
      letterSpacing: 2,
      textTransform: 'uppercase',
      fontWeight: '600',
    },

    btnWrap: { position: 'absolute', bottom: 50, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
    ring: { position: 'absolute', width: 72, height: 72, borderRadius: 36 },
    scanBtn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 20,
      elevation: 12,
    },
    scanBtnIcon: { fontSize: 22, color: C.bg },

    erroBanner: {
      position: 'absolute',
      bottom: 160,
      left: 20,
      right: 20,
      backgroundColor: C.errorSurface,
      borderLeftWidth: 3,
      borderLeftColor: C.error,
      borderRadius: 10,
      padding: 12,
      elevation: 20,
      zIndex: 20,
    },
    erroText: { color: C.error, fontSize: 12, fontWeight: '600' },

    resultCard: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: SCREEN_H * 0.62,
      backgroundColor: C.cardBg,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      borderTopWidth: 1,
      paddingTop: 20,
      paddingHorizontal: 24,
      paddingBottom: 0,
    },
    resultCardContent: {
      paddingBottom: 42,
    },
    handle: {
      width: 36,
      height: 3,
      backgroundColor: C.handleBar,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    binRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    objName: { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    objMaterial: { fontSize: 13, fontWeight: '700', marginTop: 3, letterSpacing: 0.2 },
    confiancaBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
    confiancaText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },

    infoRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    infoBox: { borderRadius: 12, borderWidth: 1, padding: 11, backgroundColor: C.surface },
    infoLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 2, color: C.textLabel, marginBottom: 5 },
    infoText: { fontSize: 12, color: C.textBody, lineHeight: 17 },

    ptsPreview: {
      backgroundColor: C.primarySurface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.primaryGlow,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 12,
      alignItems: 'center',
    },
    ptsPreviewText: { fontSize: 12, fontWeight: '700', color: C.primary, opacity: 0.8 },

    confirmBtn: { borderWidth: 1.5, borderRadius: 16, padding: 16, alignItems: 'center' },
    confirmText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
    skipLink: { alignItems: 'center', paddingTop: 12 },
    skipLinkText: { fontSize: 12, color: C.textMuted, fontWeight: '600' },

    analyzeOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(7,14,9,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    analyzeBox: { alignItems: 'center', gap: 14 },
    analyzeText: { fontSize: 13, fontWeight: '700', color: C.primary, letterSpacing: 1.5, textTransform: 'uppercase' },

    verifyHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      position: 'absolute',
      bottom: 140,
      left: 24,
      right: 24,
    },
    verifyHintTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
    verifyHintSub: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

    verifySuccess: { alignItems: 'center', paddingVertical: 16 },
    verifySuccessIcon: { fontSize: 52, marginBottom: 12 },
    verifySuccessTitle: { fontSize: 22, fontWeight: '900', color: C.text, marginBottom: 8 },
    verifyPtsRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
    verifyPts: { fontSize: 32, fontWeight: '900', color: C.primary },
    verifyPtsSub: { fontSize: 13, color: C.textMuted, fontWeight: '600' },

    verifyFailure: { alignItems: 'center', paddingVertical: 16, width: '100%' },
    verifyFailureIcon: { fontSize: 44, marginBottom: 10, opacity: 0.7 },
    verifyFailureTitle: { fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 6 },
    verifyFailureSub: { fontSize: 13, color: C.textMuted, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
    verifyFailureBtns: { flexDirection: 'row', gap: 10, width: '100%' },

    permIcon: { fontSize: 48, marginBottom: 20, opacity: 0.4 },
    permTitle: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8 },
    permSub: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 32 },
    permBtn: { backgroundColor: C.primary, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 16 },
    permBtnText: { color: C.bg, fontWeight: '900', fontSize: 15, letterSpacing: 0.3 },
  });
}
