import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ItemHistorico } from '../types';

const CHAVE_PONTOS = '@recicla:pontos';
const CHAVE_HISTORICO = '@recicla:historico';
const CHAVE_RESGATES = '@recicla:resgates';

export async function carregarPontos(): Promise<number> {
  const valor = await AsyncStorage.getItem(CHAVE_PONTOS);
  return valor ? parseInt(valor, 10) : 0;
}

export async function salvarPontos(pontos: number): Promise<void> {
  await AsyncStorage.setItem(CHAVE_PONTOS, String(pontos));
}

export async function carregarHistorico(): Promise<ItemHistorico[]> {
  const valor = await AsyncStorage.getItem(CHAVE_HISTORICO);
  return valor ? JSON.parse(valor) : [];
}

export async function adicionarAoHistorico(item: ItemHistorico): Promise<void> {
  const historico = await carregarHistorico();
  const atualizado = [item, ...historico].slice(0, 50);
  await AsyncStorage.setItem(CHAVE_HISTORICO, JSON.stringify(atualizado));
}

export async function carregarResgates(): Promise<string[]> {
  const valor = await AsyncStorage.getItem(CHAVE_RESGATES);
  return valor ? JSON.parse(valor) : [];
}

export async function resgatar(id: string): Promise<void> {
  const resgates = await carregarResgates();
  if (!resgates.includes(id)) {
    await AsyncStorage.setItem(CHAVE_RESGATES, JSON.stringify([...resgates, id]));
  }
}
