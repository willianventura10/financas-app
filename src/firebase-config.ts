import type { FirebaseOptions } from 'firebase/app'

/**
 * Bloco de configuração do app Web, copiado do console do Firebase
 * (Configurações do projeto > Seus apps). Não é segredo: quem protege os dados
 * são o login e as regras em firestore.rules.
 *
 * Se for null, o app roda em modo local, sem login e sem sincronização.
 */
export const firebaseConfig: FirebaseOptions | null = {
  apiKey: 'AIzaSyDtD4cyKKNfEdPWZSdxe_7Y9A3NicH1rxc',
  authDomain: 'financas-6be07.firebaseapp.com',
  projectId: 'financas-6be07',
  storageBucket: 'financas-6be07.firebasestorage.app',
  messagingSenderId: '79604085778',
  appId: '1:79604085778:web:b0f63f7d7fa203f5b3d4cb',
}
