import { View, Text } from 'react-native';

const MATERIAL_LABEL: Record<string, string> = {
  azul: 'PAPEL',
  vermelho: 'PLÁSTICO',
  verde: 'VIDRO',
  amarelo: 'METAL',
  marrom: 'ORGÂNICO',
  cinza: 'REJEITO',
  especial: 'ESPECIAL',
};

// slightly darker shade for the lid
function darken(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (n >> 16) - 40);
  const g = Math.max(0, ((n >> 8) & 0xff) - 40);
  const b = Math.max(0, (n & 0xff) - 40);
  return `rgb(${r},${g},${b})`;
}

interface Props {
  lixeira: string;
  cor: string;
  size?: number;
}

export function LixeiraIcon({ lixeira, cor, size = 80 }: Props) {
  const label = MATERIAL_LABEL[lixeira.toLowerCase()] ?? lixeira.toUpperCase();
  const lidColor = darken(cor);

  return (
    <View style={{ width: size, alignItems: 'center' }}>

      {/* Handle (alça no topo) */}
      <View style={{
        width: size * 0.28,
        height: size * 0.09,
        backgroundColor: lidColor,
        borderTopLeftRadius: size * 0.06,
        borderTopRightRadius: size * 0.06,
        zIndex: 2,
      }} />

      {/* Tampa */}
      <View style={{
        width: size,
        height: size * 0.14,
        backgroundColor: lidColor,
        borderTopLeftRadius: size * 0.06,
        borderTopRightRadius: size * 0.06,
        marginTop: -1,
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 3,
      }} />

      {/* Corpo da lixeira */}
      <View style={{
        width: size,
        height: size * 1.05,
        backgroundColor: cor,
        borderBottomLeftRadius: size * 0.1,
        borderBottomRightRadius: size * 0.1,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: cor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 6,
        gap: 4,
      }}>

        {/* Símbolo de reciclagem */}
        <Text style={{
          fontSize: size * 0.42,
          color: 'rgba(255,255,255,0.92)',
          lineHeight: size * 0.5,
        }}>♻</Text>

        {/* Nome do material */}
        <Text style={{
          fontSize: size * 0.115,
          color: 'rgba(255,255,255,0.85)',
          fontWeight: '900',
          letterSpacing: size * 0.02,
          textAlign: 'center',
        }}>{label}</Text>

      </View>
    </View>
  );
}
