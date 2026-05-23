// How-to guides that target informational search intent ("how to decode a
// CSR") and funnel to the matching client-side tool. Content is structured
// and bilingual (EN/IT) so it renders without MDX and stays inside the
// site's strict CSP (no inline scripts, no network).

import type { Locale } from "~/i18n";

export interface GuideSection {
  heading: string;
  body: string[];
}

export interface GuideContent {
  title: string;
  description: string;
  intro: string;
  sections: GuideSection[];
  toolCta: string;
}

export interface Guide {
  slug: string;
  /** Matching internal tool slug, for the call-to-action link. */
  toolSlug: string;
  en: GuideContent;
  it: GuideContent;
}

export const guides: Guide[] = [
  {
    slug: "how-to-decode-an-ssl-certificate",
    toolSlug: "certificate-decoder",
    en: {
      title: "How to decode an SSL certificate",
      description:
        "Read what's inside a PEM/DER SSL certificate — subject, SANs, issuer, validity and key — without uploading it anywhere. Step-by-step, in your browser or with OpenSSL.",
      intro:
        "An X.509 certificate is just structured data: who it's for, who issued it, when it's valid, and the public key it binds. Here's how to read all of it — locally, without sending the file to a third party.",
      sections: [
        {
          heading: "What's inside a certificate",
          body: [
            "The fields that matter day-to-day are the Subject (the entity the cert is for), the Subject Alternative Names (the hostnames it actually covers — browsers ignore the legacy Common Name), the Issuer (the CA that signed it), the validity window (notBefore / notAfter), and the public key algorithm and size.",
            "The Subject Alternative Name list is the one people get wrong most often: if the hostname you visit isn't in it, the browser rejects the certificate even though everything else is fine.",
          ],
        },
        {
          heading: "Decode it in your browser",
          body: [
            "Paste the PEM block (the text between BEGIN CERTIFICATE and END CERTIFICATE) into the Certificate Decoder. It parses the certificate entirely client-side — nothing is uploaded — and shows the subject, SANs, issuer, validity, key and extensions in plain form.",
          ],
        },
        {
          heading: "Or with OpenSSL on the command line",
          body: [
            "If you prefer the terminal: openssl x509 -in cert.pem -noout -text prints the full decoded certificate. For just the essentials, openssl x509 -in cert.pem -noout -subject -issuer -dates -ext subjectAltName.",
          ],
        },
      ],
      toolCta: "Open the Certificate Decoder",
    },
    it: {
      title: "Come decodificare un certificato SSL",
      description:
        "Leggi cosa contiene un certificato SSL PEM/DER — subject, SAN, issuer, validità e chiave — senza caricarlo da nessuna parte. Passo-passo, nel browser o con OpenSSL.",
      intro:
        "Un certificato X.509 è solo dati strutturati: per chi è, chi lo ha emesso, quando è valido e quale chiave pubblica lega. Ecco come leggerli tutti — in locale, senza inviare il file a terzi.",
      sections: [
        {
          heading: "Cosa contiene un certificato",
          body: [
            "I campi che contano ogni giorno sono il Subject (l'entità a cui il certificato è intestato), i Subject Alternative Name (gli hostname che copre davvero — i browser ignorano il vecchio Common Name), l'Issuer (la CA che lo ha firmato), la finestra di validità (notBefore / notAfter), e algoritmo e dimensione della chiave pubblica.",
            "La lista dei Subject Alternative Name è quella che si sbaglia più spesso: se l'hostname che visiti non è presente, il browser rifiuta il certificato anche se tutto il resto è corretto.",
          ],
        },
        {
          heading: "Decodificalo nel browser",
          body: [
            "Incolla il blocco PEM (il testo tra BEGIN CERTIFICATE e END CERTIFICATE) nel Certificate Decoder. Analizza il certificato interamente lato client — nulla viene caricato — e mostra subject, SAN, issuer, validità, chiave ed estensioni in forma leggibile.",
          ],
        },
        {
          heading: "Oppure con OpenSSL da riga di comando",
          body: [
            "Se preferisci il terminale: openssl x509 -in cert.pem -noout -text stampa il certificato decodificato completo. Per i soli elementi essenziali, openssl x509 -in cert.pem -noout -subject -issuer -dates -ext subjectAltName.",
          ],
        },
      ],
      toolCta: "Apri il Certificate Decoder",
    },
  },
  {
    slug: "how-to-read-a-csr",
    toolSlug: "csr-decoder",
    en: {
      title: "How to read a CSR (Certificate Signing Request)",
      description:
        "Verify what a CSR actually requests — subject, SANs, key type and size — before you send it to a CA. Decode it client-side or with OpenSSL.",
      intro:
        "A Certificate Signing Request bundles the details you want in a certificate plus your public key, signed by your private key. Checking it before submission saves a wasted issuance when a hostname or key size is wrong.",
      sections: [
        {
          heading: "Why verify a CSR first",
          body: [
            "The CA issues a certificate based on what's in the CSR. If the Subject Alternative Names are missing the hostname you need, or the key is too small, you'll only find out after issuance — and have to start over. A 30-second check avoids that.",
          ],
        },
        {
          heading: "Decode it in your browser",
          body: [
            "Paste the CSR (BEGIN CERTIFICATE REQUEST … END CERTIFICATE REQUEST) into the CSR Decoder. It shows the requested subject, the SAN list, and the public key algorithm and size, parsed entirely on your device.",
          ],
        },
        {
          heading: "Or with OpenSSL",
          body: [
            "openssl req -in request.csr -noout -text -verify prints the decoded request and confirms the self-signature is valid — a quick integrity check that the CSR wasn't truncated or corrupted.",
          ],
        },
      ],
      toolCta: "Open the CSR Decoder",
    },
    it: {
      title: "Come leggere una CSR (Certificate Signing Request)",
      description:
        "Verifica cosa richiede davvero una CSR — subject, SAN, tipo e dimensione della chiave — prima di inviarla a una CA. Decodificala lato client o con OpenSSL.",
      intro:
        "Una Certificate Signing Request raccoglie i dettagli che vuoi nel certificato più la tua chiave pubblica, firmati dalla tua chiave privata. Controllarla prima dell'invio evita un'emissione sprecata quando un hostname o la dimensione della chiave sono sbagliati.",
      sections: [
        {
          heading: "Perché verificare prima una CSR",
          body: [
            "La CA emette un certificato in base a ciò che c'è nella CSR. Se ai Subject Alternative Name manca l'hostname che ti serve, o la chiave è troppo piccola, te ne accorgi solo dopo l'emissione — e devi ricominciare. Un controllo di 30 secondi lo evita.",
          ],
        },
        {
          heading: "Decodificala nel browser",
          body: [
            "Incolla la CSR (BEGIN CERTIFICATE REQUEST … END CERTIFICATE REQUEST) nel CSR Decoder. Mostra il subject richiesto, la lista dei SAN e algoritmo e dimensione della chiave pubblica, analizzati interamente sul tuo dispositivo.",
          ],
        },
        {
          heading: "Oppure con OpenSSL",
          body: [
            "openssl req -in request.csr -noout -text -verify stampa la richiesta decodificata e conferma che l'auto-firma è valida — un rapido controllo d'integrità che la CSR non sia troncata o corrotta.",
          ],
        },
      ],
      toolCta: "Apri il CSR Decoder",
    },
  },
  {
    slug: "check-private-key-matches-certificate",
    toolSlug: "key-matcher",
    en: {
      title: "How to check a private key matches a certificate",
      description:
        "Confirm a private key and an SSL certificate are a pair before deploying — avoid the 'key values mismatch' error. Compare them client-side or with OpenSSL.",
      intro:
        "A certificate and its private key must be a matching pair, or the server refuses to start with a 'key values mismatch' error. The check compares the public key in the certificate with the public key derived from the private key.",
      sections: [
        {
          heading: "How the match works",
          body: [
            "The private key can produce its corresponding public key. The certificate already contains a public key. If those two public keys are identical, the key and certificate are a pair. You never need to expose the private key to compare — only the derived public part.",
          ],
        },
        {
          heading: "Compare them in your browser",
          body: [
            "Paste the certificate and the private key into the Key Matcher. It derives the public key from the key, compares it with the certificate's, and tells you yes/no — all locally, with nothing uploaded.",
          ],
        },
        {
          heading: "Or with OpenSSL",
          body: [
            "Compare the modulus hashes: openssl x509 -noout -modulus -in cert.pem | openssl md5 and openssl rsa -noout -modulus -in key.pem | openssl md5. Identical hashes mean they match. (For ECDSA keys, compare the public key with openssl pkey -pubout instead.)",
          ],
        },
      ],
      toolCta: "Open the Key Matcher",
    },
    it: {
      title: "Come verificare che una chiave privata corrisponda a un certificato",
      description:
        "Conferma che chiave privata e certificato SSL siano una coppia prima del deploy — evita l'errore 'key values mismatch'. Confrontali lato client o con OpenSSL.",
      intro:
        "Un certificato e la sua chiave privata devono essere una coppia corrispondente, altrimenti il server rifiuta di avviarsi con un errore 'key values mismatch'. Il controllo confronta la chiave pubblica nel certificato con quella derivata dalla chiave privata.",
      sections: [
        {
          heading: "Come funziona la corrispondenza",
          body: [
            "La chiave privata può produrre la sua chiave pubblica corrispondente. Il certificato contiene già una chiave pubblica. Se quelle due chiavi pubbliche sono identiche, chiave e certificato sono una coppia. Non serve mai esporre la chiave privata per confrontarle — solo la parte pubblica derivata.",
          ],
        },
        {
          heading: "Confrontali nel browser",
          body: [
            "Incolla certificato e chiave privata nel Key Matcher. Deriva la chiave pubblica dalla chiave, la confronta con quella del certificato e ti dice sì/no — tutto in locale, senza caricare nulla.",
          ],
        },
        {
          heading: "Oppure con OpenSSL",
          body: [
            "Confronta gli hash del modulo: openssl x509 -noout -modulus -in cert.pem | openssl md5 e openssl rsa -noout -modulus -in key.pem | openssl md5. Hash identici significano che corrispondono. (Per chiavi ECDSA, confronta la chiave pubblica con openssl pkey -pubout.)",
          ],
        },
      ],
      toolCta: "Apri il Key Matcher",
    },
  },
  {
    slug: "how-to-build-a-certificate-chain",
    toolSlug: "chain-builder",
    en: {
      title: "How to build a certificate chain (fullchain.pem)",
      description:
        "Assemble leaf + intermediate(s) into a correct fullchain.pem and avoid NET::ERR_CERT_AUTHORITY_INVALID from a missing intermediate. Order matters.",
      intro:
        "Most 'untrusted certificate' incidents are a missing or mis-ordered intermediate. A correct chain file lets any client verify your certificate up to a trusted root. Here's how to build it right.",
      sections: [
        {
          heading: "What the chain must contain — and the order",
          body: [
            "A chain file is the leaf certificate first, then each intermediate that signed it, in order, up to (but not including) the root. The order matters: leaf, then intermediate, then any second intermediate. The root is already in client trust stores, so you don't ship it.",
            "Serving only the leaf (cert.pem) is the classic cause of NET::ERR_CERT_AUTHORITY_INVALID / SEC_ERROR_UNKNOWN_ISSUER for clients that haven't cached the intermediate.",
          ],
        },
        {
          heading: "Build and verify it in your browser",
          body: [
            "Paste your leaf and the intermediate(s) into the Chain Builder. It orders them correctly, flags a missing or out-of-order intermediate, and produces a fullchain.pem you can paste into your server config.",
          ],
        },
        {
          heading: "Or verify with OpenSSL",
          body: [
            "openssl verify -untrusted intermediates.pem cert.pem confirms the leaf chains to a trusted root through the intermediates you provide. A failure here is exactly what browsers will reject.",
          ],
        },
      ],
      toolCta: "Open the Chain Builder",
    },
    it: {
      title: "Come costruire una catena di certificati (fullchain.pem)",
      description:
        "Assembla foglia + intermedi in un fullchain.pem corretto ed evita NET::ERR_CERT_AUTHORITY_INVALID per un intermedio mancante. L'ordine conta.",
      intro:
        "La maggior parte degli incidenti di 'certificato non attendibile' è un intermedio mancante o in ordine sbagliato. Un file di catena corretto permette a qualsiasi client di verificare il tuo certificato fino a una root attendibile. Ecco come costruirlo bene.",
      sections: [
        {
          heading: "Cosa deve contenere la catena — e l'ordine",
          body: [
            "Un file di catena ha prima il certificato foglia, poi ogni intermedio che lo ha firmato, in ordine, fino alla root (esclusa). L'ordine conta: foglia, poi intermedio, poi un eventuale secondo intermedio. La root è già nei trust store dei client, quindi non la distribuisci.",
            "Servire solo la foglia (cert.pem) è la causa classica di NET::ERR_CERT_AUTHORITY_INVALID / SEC_ERROR_UNKNOWN_ISSUER per i client che non hanno l'intermedio in cache.",
          ],
        },
        {
          heading: "Costruiscila e verificala nel browser",
          body: [
            "Incolla la foglia e gli intermedi nel Chain Builder. Li ordina correttamente, segnala un intermedio mancante o fuori ordine e produce un fullchain.pem da incollare nella configurazione del server.",
          ],
        },
        {
          heading: "Oppure verifica con OpenSSL",
          body: [
            "openssl verify -untrusted intermediates.pem cert.pem conferma che la foglia si concatena a una root attendibile attraverso gli intermedi forniti. Un fallimento qui è esattamente ciò che i browser rifiuteranno.",
          ],
        },
      ],
      toolCta: "Apri il Chain Builder",
    },
  },
];

export function guideContent(g: Guide, locale: Locale): GuideContent {
  return locale === "it" ? g.it : g.en;
}
