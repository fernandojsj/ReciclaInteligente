import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { carregarHistorico, carregarPontos } from '../services/storage';
import { buscarEcopontos, formatarDistancia } from '../services/ecopontos';
import { COR_LIXEIRA } from '../constants/lixeiras';
import { useTheme } from '../context/ThemeContext';
import type { Cores } from '../context/ThemeContext';
import type { ItemHistorico } from '../types';
import type { Ecoponto } from '../services/ecopontos';

export default function HistoricoScreen() {
  const { C, modo } = useTheme();
  const styles = useMemo(() => makeStyles(C), [modo]);

  const [historico, setHistorico] = useState<ItemHistorico[]>([]);
  const [pontos, setPontos] = useState(0);
  const [ecopontos, setEcopontos] = useState<Ecoponto[]>([]);
  const [buscandoEco, setBuscandoEco] = useState(false);
  const [ecoBuscado, setEcoBuscado] = useState(false);
  const [erroEco, setErroEco] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function carregarDados() {
    const [hist, pts] = await Promise.all([carregarHistorico(), carregarPontos()]);
    setHistorico(hist);
    setPontos(pts);
  }

  useFocusEffect(useCallback(() => { carregarDados(); }, []));

  async function onRefresh() {
    setRefreshing(true);
    await carregarDados();
    setRefreshing(false);
  }

  async function buscarEcopontosProximos() {
    setBuscandoEco(true);
    setErroEco(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErroEco('Permissão de localização negada.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const res = await buscarEcopontos(loc.coords.latitude, loc.coords.longitude);
      setEcopontos(res);
      setEcoBuscado(true);
      if (res.length === 0) setErroEco('Nenhum ecoponto encontrado num raio de 3 km.');
    } catch (e: any) {
      const msg = e?.response?.data ?? e?.message ?? String(e);
      console.error('ERRO ECOPONTOS:', JSON.stringify(msg));
      setErroEco(`Erro: ${e?.message ?? 'Verifique sua conexão.'}`);
    } finally {
      setBuscandoEco(false);
    }
  }

  function formatarData(ts: number): string {
    return new Date(ts).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  const reciclaveis = historico.filter(i => i.reciclavel).length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTag}>PAINEL</Text>
        <Text style={styles.headerTitle}>Histórico</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <View style={styles.statMain}>
          <Text style={styles.statBigValue}>{pontos}</Text>
          <Text style={styles.statBigLabel}>PONTOS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statSmValue}>{historico.length}</Text>
          <Text style={styles.statSmLabel}>escaneados</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statSmValue}>{reciclaveis}</Text>
          <Text style={styles.statSmLabel}>reciclados</Text>
        </View>
      </View>

      {/* Ecopontos */}
      <View style={styles.sectionRow}>
        <View>
          <Text style={styles.sectionTag}>MAPA</Text>
          <Text style={styles.sectionTitle}>Ecopontos Próximos</Text>
        </View>
      </View>

      {!buscandoEco && (
        <TouchableOpacity style={styles.searchBtn} onPress={buscarEcopontosProximos} activeOpacity={0.8}>
          <Text style={styles.searchIcon}>📍</Text>
          <Text style={styles.searchText}>
            {ecoBuscado ? 'Atualizar localização' : 'Buscar Ecopontos Perto de Mim'}
          </Text>
        </TouchableOpacity>
      )}

      {buscandoEco && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={C.primary} size="small" />
          <Text style={styles.loadingText}>Buscando ecopontos próximos...</Text>
        </View>
      )}

      {erroEco && (
        <View style={styles.erroBox}>
          <Text style={styles.erroText}>{erroEco}</Text>
        </View>
      )}

      {ecopontos.map((eco) => (
        <View key={eco.id} style={styles.ecoCard}>
          <View style={styles.ecoIcon}>
            <Text style={{ fontSize: 18 }}>♻️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ecoName}>{eco.nome}</Text>
            <Text style={styles.ecoDist}>📍  {formatarDistancia(eco.distanciaM)}</Text>
            {eco.materiais.length > 0 && (
              <Text style={styles.ecoMats}>{eco.materiais.join(' · ')}</Text>
            )}
          </View>
        </View>
      ))}

      {/* Histórico */}
      <View style={[styles.sectionRow, { marginTop: 28 }]}>
        <View>
          <Text style={styles.sectionTag}>REGISTROS</Text>
          <Text style={styles.sectionTitle}>Itens Escaneados</Text>
        </View>
        {historico.length > 0 && (
          <Text style={styles.sectionCount}>{historico.length}</Text>
        )}
      </View>

      {historico.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>Nenhum registro ainda</Text>
          <Text style={styles.emptySub}>Escaneie um objeto na aba Scanner</Text>
        </View>
      ) : (
        historico.map((item) => {
          const corHex = COR_LIXEIRA[item.lixeira.toLowerCase()] ?? '#616161';
          return (
            <View key={item.id} style={styles.histCard}>
              <View style={[styles.histAccent, { backgroundColor: corHex, shadowColor: corHex }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.histObj}>{item.objeto}</Text>
                <Text style={styles.histDetail}>
                  Lixeira {item.lixeira}  ·  {item.material}
                </Text>
                <Text style={styles.histDate}>{formatarData(item.timestamp)}</Text>
              </View>
              {item.pontosGanhos > 0 ? (
                <View style={[styles.ptsBadge, { borderColor: corHex + '45' }]}>
                  <Text style={[styles.ptsText, { color: corHex }]}>+{item.pontosGanhos}</Text>
                </View>
              ) : (
                <View style={styles.ptsBadgeGray}>
                  <Text style={styles.ptsTextGray}>—</Text>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function makeStyles(C: Cores) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { paddingBottom: 48 },

    header: { paddingTop: 56, paddingHorizontal: 24, paddingBottom: 20 },
    headerTag: { fontSize: 9, fontWeight: '800', letterSpacing: 5, color: C.primary, marginBottom: 2, opacity: 0.7 },
    headerTitle: { fontSize: 30, fontWeight: '900', color: C.text, letterSpacing: -0.8 },

    statsCard: {
      marginHorizontal: 20,
      backgroundColor: C.primaryDim,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: C.primaryBorder,
      padding: 22,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 32,
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4,
    },
    statMain: { flex: 1.6, alignItems: 'center' },
    statBigValue: { fontSize: 48, fontWeight: '900', color: C.primary, letterSpacing: -2 },
    statBigLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 3, color: C.primary, opacity: 0.6, marginTop: -2 },
    statDivider: { width: 1, height: 52, backgroundColor: C.primaryBorder },
    statCol: { flex: 1, alignItems: 'center' },
    statSmValue: { fontSize: 26, fontWeight: '900', color: C.text },
    statSmLabel: { fontSize: 9, color: C.textMuted, fontWeight: '700', letterSpacing: 0.8, marginTop: 1 },

    sectionRow: {
      paddingHorizontal: 20,
      marginBottom: 14,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    },
    sectionTag: { fontSize: 9, fontWeight: '800', letterSpacing: 3.5, color: C.primary, opacity: 0.65, marginBottom: 2 },
    sectionTitle: { fontSize: 19, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    sectionCount: { fontSize: 13, fontWeight: '700', color: C.textMuted, paddingBottom: 2 },

    searchBtn: {
      marginHorizontal: 20,
      backgroundColor: C.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.primaryBorder,
      borderStyle: 'dashed',
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 12,
    },
    searchIcon: { fontSize: 16 },
    searchText: { color: C.primary, fontWeight: '700', fontSize: 14, letterSpacing: 0.2 },

    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 12 },
    loadingText: { color: C.textMuted, fontSize: 13 },

    erroBox: {
      marginHorizontal: 20,
      backgroundColor: C.errorSurface,
      borderRadius: 10,
      padding: 12,
      borderLeftWidth: 3,
      borderLeftColor: C.error,
      marginBottom: 10,
    },
    erroText: { color: C.error, fontSize: 13 },

    ecoCard: {
      marginHorizontal: 20,
      backgroundColor: C.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.cardBorder,
      padding: 14,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    ecoIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
    ecoName: { fontSize: 14, fontWeight: '700', color: C.text },
    ecoDist: { fontSize: 12, color: C.primary, marginTop: 3, fontWeight: '600' },
    ecoMats: { fontSize: 11, color: C.textMuted, marginTop: 3 },

    emptyState: { alignItems: 'center', paddingVertical: 52, paddingHorizontal: 32 },
    emptyIcon: { fontSize: 40, marginBottom: 14, opacity: 0.25 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: C.text, opacity: 0.4, marginBottom: 6 },
    emptySub: { fontSize: 13, color: C.textMuted, textAlign: 'center' },

    histCard: {
      marginHorizontal: 20,
      backgroundColor: C.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.cardBorder,
      padding: 14,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    histAccent: { width: 3, height: 44, borderRadius: 2, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 2 },
    histObj: { fontSize: 14, fontWeight: '700', color: C.text },
    histDetail: { fontSize: 12, color: C.textMuted, marginTop: 3 },
    histDate: { fontSize: 10, color: C.textLabel, marginTop: 4 },

    ptsBadge: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 5 },
    ptsText: { fontSize: 12, fontWeight: '900' },
    ptsBadgeGray: { borderWidth: 1, borderColor: C.cardBorder, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 5 },
    ptsTextGray: { fontSize: 12, fontWeight: '700', color: C.textMuted },
  });
}
