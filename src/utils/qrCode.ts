import QRCode from 'qrcode'

/**
 * Génère une URL de données (Data URL Base64) pour un QR Code à partir d'un texte donné.
 * Utilisable côté client ou serveur.
 */
export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  } catch (err) {
    console.error('Erreur lors de la génération du QR Code:', err)
    return ''
  }
}
