export interface Recompensa {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  custo: number;
  categoria: 'eco' | 'beneficio' | 'conquista';
}

export const RECOMPENSAS: Recompensa[] = [
  { id: 'r1', nome: 'Muda de Planta', descricao: 'Planta nativa para o seu espaço verde', icone: '🌱', custo: 150, categoria: 'eco' },
  { id: 'r2', nome: 'Copo de Bambu', descricao: 'Copo reutilizável 350ml sustentável', icone: '🎋', custo: 300, categoria: 'eco' },
  { id: 'r3', nome: 'Sacola Ecológica', descricao: 'Sacola de algodão orgânico certificado', icone: '🛍️', custo: 250, categoria: 'eco' },
  { id: 'r4', nome: 'Kit Compostagem', descricao: 'Kit completo para compostar em casa', icone: '🌿', custo: 600, categoria: 'eco' },
  { id: 'r5', nome: '10% Eco-Mercado', descricao: 'Cupom de desconto em produtos naturais', icone: '🏪', custo: 500, categoria: 'beneficio' },
  { id: 'r6', nome: 'Frete Verde Grátis', descricao: 'Entrega com compensação de carbono', icone: '🚲', custo: 400, categoria: 'beneficio' },
  { id: 'r7', nome: 'Café Orgânico', descricao: '250g de café de agricultura sustentável', icone: '☕', custo: 350, categoria: 'beneficio' },
  { id: 'c1', nome: 'Iniciante Verde', descricao: 'Primeiros passos na reciclagem correta', icone: '🥉', custo: 50, categoria: 'conquista' },
  { id: 'c2', nome: 'Eco Warrior', descricao: 'Compromisso consistente com o planeta', icone: '🏅', custo: 350, categoria: 'conquista' },
  { id: 'c3', nome: 'Guardião do Planeta', descricao: 'Título máximo de consciência ambiental', icone: '🌍', custo: 1000, categoria: 'conquista' },
];
