import type { FirebaseOptions } from 'firebase/app'

/**
 * Bloco de configuração do app Web, copiado do console do Firebase
 * (Configurações do projeto > Seus apps). Não é segredo: quem protege os dados
 * são o login e as regras em firestore.rules.
 *
 * Enquanto for null, o app roda em modo local, sem login e sem sincronização.
 */
export const firebaseConfig: FirebaseOptions | null = null
