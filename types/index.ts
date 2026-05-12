export interface Resultado {
  objeto: string;
  lixeira: string;
  material: string;
  preparo: string;
  dica: string;
  reciclavel: boolean;
  confianca: 'alta' | 'media' | 'baixa';
}

export interface ItemHistorico extends Resultado {
  id: string;
  timestamp: number;
  pontosGanhos: number;
}
