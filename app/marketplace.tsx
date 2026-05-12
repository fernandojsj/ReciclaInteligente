import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { carregarPontos, salvarPontos, carregarResgates, resgatar } from '../services/storage';
import { RECOMPENSAS, type Recompensa } from '../constants/recompensas';
import { useTheme } from '../context/ThemeContext';
import type { Cores } from '../context/ThemeContext';

type Categoria = 'todos' | 'eco' | 'beneficio' | 'conquista';

const CATEGORIAS: { key: Categoria; label: string; icone: string }[] = [
  { key: 'todos', label: 'Todos', icone: '✦' },
  { key: 'eco', label: 'Eco', icone: '🌿' },
  { key: 'beneficio', label: 'Benefícios', icone: '🎁' },
  { key: 'conquista', label: 'Títulos', icone: '🏆' },
];

export default function MarketplaceScreen() {
  const { C, modo } = useTheme();
  const styles = useMemo(() => makeStyles(C), [modo]);

  const [pontos, setPontos] = useState(0);
  const [resgates, setResgates] = useState<string[]>([]);
  const [categoria, setCategoria] = useState<Categoria>('todos');
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<Recompensa | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function carregar() {
    const [pts, res] = await Promise.all([carregarPontos(), carregarResgates()]);
    setPontos(pts);
    setResgates(res);
  }

  useFocusEffect(useCallback(() => { carregar(); }, []));

  async function onRefresh() {
    setRefreshing(true);
    await carregar();
    setRefreshing(false);
  }

  async function confirmarResgate(item: Recompensa) {
    if (pontos < item.custo) return;
    const novos = pontos - item.custo;
    await salvarPontos(novos);
    await resgatar(item.id);
    setPontos(novos);
    setResgates(r => [...r, item.id]);
    setModal(null);
    setSucesso(true);
    setTimeout(() => setSucesso(false), 2500);
  }

  const filtrados = categoria === 'todos'
    ? RECOMPENSAS
    : RECOMPENSAS.filter(r => r.categoria === categoria);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ backgroundColor: C.bg }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTag}>LOJA</Text>
          <Text style={styles.headerTitle}>Marketplace</Text>
        </View>

        {/* Saldo */}
        <View style={styles.saldoCard}>
          <View>
            <Text style={styles.saldoLabel}>SEU SALDO</Text>
            <Text style={styles.saldoValor}>{pontos} <Text style={styles.saldoPts}>pts</Text></Text>
          </View>
          <Text style={styles.saldoIcone}>♻️</Text>
        </View>

        {/* Filtro */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriaScroll} contentContainerStyle={styles.categoriaRow}>
          {CATEGORIAS.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.catBtn, categoria === cat.key && styles.catBtnAtivo]}
              onPress={() => setCategoria(cat.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.catTexto, categoria === cat.key && styles.catTextoAtivo]}>
                {cat.icone}  {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Grid */}
        <View style={styles.grid}>
          {filtrados.map(item => {
            const resgatado = resgates.includes(item.id);
            const podeResgatar = pontos >= item.custo && !resgatado;
            const faltam = item.custo - pontos;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, resgatado && styles.cardResgatado]}
                onPress={() => !resgatado && setModal(item)}
                activeOpacity={resgatado ? 1 : 0.8}
              >
                <Text style={styles.cardIcone}>{item.icone}</Text>
                <Text style={styles.cardNome} numberOfLines={1}>{item.nome}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.descricao}</Text>

                <View style={styles.cardFooter}>
                  {resgatado ? (
                    <View style={styles.resgatadoBadge}>
                      <Text style={styles.resgatadoTexto}>✓  Resgatado</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.cardCusto, !podeResgatar && { color: C.textMuted }]}>
                        {item.custo} pts
                      </Text>
                      {!podeResgatar && (
                        <Text style={styles.cardFalta}>faltam {faltam}</Text>
                      )}
                    </>
                  )}
                </View>

                {!resgatado && (
                  <View style={[styles.cardBtn, !podeResgatar && styles.cardBtnDisabled]}>
                    <Text style={[styles.cardBtnTexto, !podeResgatar && { opacity: 0.35 }]}>
                      {podeResgatar ? 'Resgatar' : 'Pontos insuficientes'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcone}>{modal?.icone}</Text>
            <Text style={styles.modalNome}>{modal?.nome}</Text>
            <Text style={styles.modalDesc}>{modal?.descricao}</Text>

            <View style={styles.modalSaldo}>
              <View style={styles.modalSaldoRow}>
                <Text style={styles.modalSaldoLabel}>Seu saldo</Text>
                <Text style={styles.modalSaldoValor}>{pontos} pts</Text>
              </View>
              <View style={styles.modalSaldoRow}>
                <Text style={styles.modalSaldoLabel}>Custo</Text>
                <Text style={[styles.modalSaldoValor, { color: C.error }]}>− {modal?.custo} pts</Text>
              </View>
              <View style={[styles.modalSaldoRow, { borderTopWidth: 1, borderTopColor: C.cardBorder, paddingTop: 8, marginTop: 4 }]}>
                <Text style={styles.modalSaldoLabel}>Saldo após</Text>
                <Text style={[styles.modalSaldoValor, { color: C.primary }]}>
                  {pontos - (modal?.custo ?? 0)} pts
                </Text>
              </View>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnCancelar} onPress={() => setModal(null)} activeOpacity={0.8}>
                <Text style={styles.modalBtnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnConfirmar, modal && pontos < modal.custo && { opacity: 0.4 }]}
                onPress={() => modal && confirmarResgate(modal)}
                disabled={!modal || pontos < modal.custo}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnConfirmarTexto}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast */}
      {sucesso && (
        <View style={styles.toast}>
          <Text style={styles.toastTexto}>✓  Recompensa resgatada!</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(C: Cores) {
  return StyleSheet.create({
    content: { paddingBottom: 48 },

    header: { paddingTop: 56, paddingHorizontal: 24, paddingBottom: 16 },
    headerTag: { fontSize: 9, fontWeight: '800', letterSpacing: 5, color: C.primary, opacity: 0.7, marginBottom: 2 },
    headerTitle: { fontSize: 30, fontWeight: '900', color: C.text, letterSpacing: -0.8 },

    saldoCard: {
      marginHorizontal: 20,
      backgroundColor: C.primaryDim,
      borderRadius: 20,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    saldoLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 3, color: C.primary, opacity: 0.6, marginBottom: 4 },
    saldoValor: { fontSize: 40, fontWeight: '900', color: C.primary, letterSpacing: -1 },
    saldoPts: { fontSize: 16, fontWeight: '700', opacity: 0.6 },
    saldoIcone: { fontSize: 40 },

    categoriaScroll: { marginBottom: 20 },
    categoriaRow: { paddingHorizontal: 20, gap: 8 },
    catBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.cardBorder,
      backgroundColor: C.card,
    },
    catBtnAtivo: { backgroundColor: C.primaryDim, borderColor: C.primaryBorder },
    catTexto: { fontSize: 12, fontWeight: '700', color: C.textMuted },
    catTextoAtivo: { color: C.primary },

    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
    card: {
      width: '47%',
      backgroundColor: C.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.cardBorder,
      padding: 16,
      gap: 6,
    },
    cardResgatado: { opacity: 0.55 },
    cardIcone: { fontSize: 36, marginBottom: 4 },
    cardNome: { fontSize: 13, fontWeight: '800', color: C.text },
    cardDesc: { fontSize: 11, color: C.textMuted, lineHeight: 16 },
    cardFooter: { marginTop: 4 },
    cardCusto: { fontSize: 14, fontWeight: '900', color: C.primary },
    cardFalta: { fontSize: 10, color: C.error, fontWeight: '600', marginTop: 1 },
    cardBtn: {
      marginTop: 8,
      backgroundColor: C.primaryDim,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.primaryBorder,
    },
    cardBtnDisabled: { backgroundColor: C.surface, borderColor: C.cardBorder },
    cardBtnTexto: { fontSize: 12, fontWeight: '800', color: C.primary },
    resgatadoBadge: {
      backgroundColor: C.primarySurface,
      borderRadius: 8,
      paddingVertical: 5,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.primaryBorder,
    },
    resgatadoTexto: { fontSize: 11, fontWeight: '800', color: C.primary },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.75)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      backgroundColor: C.elevatedBg,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: C.primaryBorder,
      padding: 28,
      alignItems: 'center',
    },
    modalIcone: { fontSize: 56, marginBottom: 12 },
    modalNome: { fontSize: 20, fontWeight: '900', color: C.text, marginBottom: 6, textAlign: 'center' },
    modalDesc: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
    modalSaldo: { width: '100%', gap: 8, marginBottom: 24 },
    modalSaldoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalSaldoLabel: { fontSize: 13, color: C.textMuted },
    modalSaldoValor: { fontSize: 14, fontWeight: '800', color: C.text },
    modalBtns: { flexDirection: 'row', gap: 10, width: '100%' },
    modalBtnCancelar: {
      flex: 1,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.cardBorder,
      alignItems: 'center',
    },
    modalBtnCancelarTexto: { fontSize: 14, fontWeight: '700', color: C.textMuted },
    modalBtnConfirmar: {
      flex: 1,
      padding: 14,
      borderRadius: 14,
      backgroundColor: C.primary,
      alignItems: 'center',
    },
    modalBtnConfirmarTexto: { fontSize: 14, fontWeight: '900', color: C.bg },

    toast: {
      position: 'absolute',
      bottom: 90,
      alignSelf: 'center',
      backgroundColor: C.primaryDim,
      borderWidth: 1,
      borderColor: C.primaryBorder,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    toastTexto: { color: C.primary, fontWeight: '800', fontSize: 14 },
  });
}
