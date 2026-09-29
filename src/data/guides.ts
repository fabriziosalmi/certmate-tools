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
  /**
   * Matching internal tool slug, for the call-to-action link. Optional:
   * guides about live-server checks (OCSP, CT logs, TLS versions) have no
   * client-side counterpart by design (connect-src 'none') and link to a
   * curated external tool instead, or to no CTA at all for dig-only guides.
   */
  toolSlug?: string;
  /** Curated external destination, used only when toolSlug is absent. */
  externalTool?: { name: string; url: string };
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
        "Read what's inside a PEM/DER SSL certificate (subject, SANs, issuer, validity and key) without uploading it anywhere. Step by step, in your browser or with OpenSSL.",
      intro:
        "An X.509 certificate is just structured data: who it's for, who issued it, when it's valid, and the public key it binds. Here's how to read all of it locally, without sending the file to a third party.",
      sections: [
        {
          heading: "What's inside a certificate",
          body: [
            "The fields that matter day-to-day are the Subject (the entity the cert is for), the Subject Alternative Names (the hostnames it actually covers; browsers ignore the legacy Common Name), the Issuer (the CA that signed it), the validity window (notBefore / notAfter), and the public key algorithm and size.",
            "The Subject Alternative Name list is the one people get wrong most often: if the hostname you visit isn't in it, the browser rejects the certificate even though everything else is fine.",
          ],
        },
        {
          heading: "Decode it in your browser",
          body: [
            "Paste the PEM block (the text between BEGIN CERTIFICATE and END CERTIFICATE) into the Certificate Decoder. It parses the certificate entirely client-side (nothing is uploaded) and shows the subject, SANs, issuer, validity, key and extensions in plain form.",
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
        "Leggi cosa contiene un certificato SSL PEM/DER (subject, SAN, issuer, validità e chiave) senza caricarlo da nessuna parte. Passo passo, nel browser o con OpenSSL.",
      intro:
        "Un certificato X.509 è solo dati strutturati: per chi è, chi lo ha emesso, quando è valido e quale chiave pubblica lega. Ecco come leggerli tutti in locale, senza inviare il file a terzi.",
      sections: [
        {
          heading: "Cosa contiene un certificato",
          body: [
            "I campi che contano ogni giorno sono il Subject (l'entità a cui il certificato è intestato), i Subject Alternative Name (gli hostname che copre davvero; i browser ignorano il vecchio Common Name), l'Issuer (la CA che lo ha firmato), la finestra di validità (notBefore / notAfter), e algoritmo e dimensione della chiave pubblica.",
            "La lista dei Subject Alternative Name è quella che si sbaglia più spesso: se l'hostname che visiti non è presente, il browser rifiuta il certificato anche se tutto il resto è corretto.",
          ],
        },
        {
          heading: "Decodificalo nel browser",
          body: [
            "Incolla il blocco PEM (il testo tra BEGIN CERTIFICATE e END CERTIFICATE) nel Certificate Decoder. Analizza il certificato interamente lato client (nulla viene caricato) e mostra subject, SAN, issuer, validità, chiave ed estensioni in forma leggibile.",
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
        "Verify what a CSR actually requests (subject, SANs, key type and size) before you send it to a CA. Decode it client-side or with OpenSSL.",
      intro:
        "A Certificate Signing Request bundles the details you want in a certificate plus your public key, signed by your private key. Checking it before submission saves a wasted issuance when a hostname or key size is wrong.",
      sections: [
        {
          heading: "Why verify a CSR first",
          body: [
            "The CA issues a certificate based on what's in the CSR. If the Subject Alternative Names are missing the hostname you need, or the key is too small, you'll only find out after issuance, and have to start over. A 30-second check avoids that.",
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
            "openssl req -in request.csr -noout -text -verify prints the decoded request and confirms the self-signature is valid: a quick integrity check that the CSR wasn't truncated or corrupted.",
          ],
        },
      ],
      toolCta: "Open the CSR Decoder",
    },
    it: {
      title: "Come leggere una CSR (Certificate Signing Request)",
      description:
        "Verifica cosa richiede davvero una CSR (subject, SAN, tipo e dimensione della chiave) prima di inviarla a una CA. Decodificala lato client o con OpenSSL.",
      intro:
        "Una Certificate Signing Request raccoglie i dettagli che vuoi nel certificato più la tua chiave pubblica, firmati dalla tua chiave privata. Controllarla prima dell'invio evita un'emissione sprecata quando un hostname o la dimensione della chiave sono sbagliati.",
      sections: [
        {
          heading: "Perché verificare prima una CSR",
          body: [
            "La CA emette un certificato in base a ciò che c'è nella CSR. Se ai Subject Alternative Name manca l'hostname che ti serve, o la chiave è troppo piccola, te ne accorgi solo dopo l'emissione, e devi ricominciare. Un controllo di 30 secondi lo evita.",
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
            "openssl req -in request.csr -noout -text -verify stampa la richiesta decodificata e conferma che l'auto-firma è valida: un rapido controllo d'integrità che la CSR non sia troncata o corrotta.",
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
        "Confirm a private key and an SSL certificate are a pair before deploying, to avoid the 'key values mismatch' error. Compare them client-side or with OpenSSL.",
      intro:
        "A certificate and its private key must be a matching pair, or the server refuses to start with a 'key values mismatch' error. The check compares the public key in the certificate with the public key derived from the private key.",
      sections: [
        {
          heading: "How the match works",
          body: [
            "The private key can produce its corresponding public key. The certificate already contains a public key. If those two public keys are identical, the key and certificate are a pair. You never need to expose the private key to compare, only the derived public part.",
          ],
        },
        {
          heading: "Compare them in your browser",
          body: [
            "Paste the certificate and the private key into the Key Matcher. It derives the public key from the key, compares it with the certificate's, and tells you yes/no, all locally, with nothing uploaded.",
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
        "Conferma che chiave privata e certificato SSL siano una coppia prima del deploy, per evitare l'errore 'key values mismatch'. Confrontali lato client o con OpenSSL.",
      intro:
        "Un certificato e la sua chiave privata devono essere una coppia corrispondente, altrimenti il server rifiuta di avviarsi con un errore 'key values mismatch'. Il controllo confronta la chiave pubblica nel certificato con quella derivata dalla chiave privata.",
      sections: [
        {
          heading: "Come funziona la corrispondenza",
          body: [
            "La chiave privata può produrre la sua chiave pubblica corrispondente. Il certificato contiene già una chiave pubblica. Se quelle due chiavi pubbliche sono identiche, chiave e certificato sono una coppia. Non serve mai esporre la chiave privata per confrontarle, solo la parte pubblica derivata.",
          ],
        },
        {
          heading: "Confrontali nel browser",
          body: [
            "Incolla certificato e chiave privata nel Key Matcher. Deriva la chiave pubblica dalla chiave, la confronta con quella del certificato e ti dice sì/no, tutto in locale, senza caricare nulla.",
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
          heading: "What the chain must contain, and the order",
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
          heading: "Cosa deve contenere la catena, e l'ordine",
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
  {
    slug: "tls-dns-records-caa-tlsa",
    en: {
      title: "CAA and TLSA DNS records for TLS",
      description:
        "Publish CAA records to pin your CA and TLSA records for DANE, then verify both with dig. Copy-paste recipes with OpenSSL.",
      intro:
        "Two DNS record types harden TLS issuance and negotiation: CAA tells the world which certificate authorities may issue for your domain, and TLSA (DANE) binds the served certificate or key to DNS. Both are plain DNS lookups you can check in seconds.",
      sections: [
        {
          heading: "Check CAA: who may issue for you",
          body: [
            "dig example.com CAA +short lists the policy. A typical answer looks like 0 issue \"letsencrypt.org\", meaning only that CA may issue. The issuewild tag restricts wildcard issuance, and iodef sets a contact URL for violation reports.",
            "If no CAA record exists, any public CA may issue for the domain. Publishing even a minimal issue record closes that open door, and CAs are required to respect it.",
          ],
        },
        {
          heading: "Check TLSA: what DANE expects",
          body: [
            "dig _443._tcp.example.com TLSA +short shows the association. The common form is 3 1 1 followed by a hash: usage 3 (DANE-EE, the end-entity certificate), selector 1 (SPKI, the public key), type 1 (SHA-256).",
            "TLSA only carries weight together with DNSSEC: without a validated chain of trust to the record, an attacker that can spoof DNS can spoof the TLSA record too.",
          ],
        },
        {
          heading: "Generate the TLSA hash from your certificate",
          body: [
            "For a DANE-EE record, hash the public key (SPKI) with SHA-256: openssl x509 -in cert.pem -noout -pubkey | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | xxd -p -c 64. Publish the output as _443._tcp.example.com. IN TLSA 3 1 1 HEX.",
            "To cross-check a live server, fetch its certificate with openssl s_client -connect example.com:443 -servername example.com, pipe it through openssl x509 -pubkey, and run the same hash pipeline. The result must match the DNS record.",
          ],
        },
      ],
      toolCta: "Browse all tools",
    },
    it: {
      title: "Record DNS CAA e TLSA per TLS",
      description:
        "Pubblica record CAA per vincolare la CA e record TLSA per DANE, poi verificali con dig. Ricette pronte con OpenSSL.",
      intro:
        "Due tipi di record DNS rafforzano emissione e negoziazione TLS: CAA dice al mondo quali authority possono emettere per il tuo dominio, TLSA (DANE) lega certificato o chiave al DNS. Sono semplici query DNS verificabili in secondi.",
      sections: [
        {
          heading: "Verifica CAA: chi può emettere per te",
          body: [
            "dig example.com CAA +short elenca la policy. Una risposta tipica è 0 issue \"letsencrypt.org\": solo quella CA può emettere. Il tag issuewild limita le wildcard, iodef indica un contatto per le violazioni.",
            "Senza record CAA, qualsiasi CA pubblica può emettere per il dominio. Anche un record issue minimale chiude quella porta, e le CA sono tenute a rispettarlo.",
          ],
        },
        {
          heading: "Verifica TLSA: cosa si aspetta DANE",
          body: [
            "dig _443._tcp.example.com TLSA +short mostra l'associazione. La forma comune è 3 1 1 seguito da un hash: usage 3 (DANE-EE, il certificato finale), selector 1 (SPKI, la chiave pubblica), type 1 (SHA-256).",
            "TLSA ha peso solo con DNSSEC: senza una catena validata fino al record, chi può falsificare il DNS può falsificare anche il TLSA.",
          ],
        },
        {
          heading: "Genera l'hash TLSA dal certificato",
          body: [
            "Per un record DANE-EE, calcola l'hash SHA-256 della chiave pubblica (SPKI): openssl x509 -in cert.pem -noout -pubkey | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | xxd -p -c 64. Pubblica l'output come _443._tcp.example.com. IN TLSA 3 1 1 HEX.",
            "Per controllare un server live, scarica il certificato con openssl s_client -connect example.com:443 -servername example.com, estrai la chiave con openssl x509 -pubkey ed esegui la stessa pipeline di hash. Il risultato deve coincidere col record DNS.",
          ],
        },
      ],
      toolCta: "Sfoglia tutti gli strumenti",
    },
  },
  {
    slug: "check-ocsp-crl-revocation",
    toolSlug: undefined,
    externalTool: {
      name: "Revocation Check",
      url: "https://certificate.revocationcheck.com/",
    },
    en: {
      title: "How to check OCSP and CRL revocation",
      description:
        "Verify a certificate is not revoked via OCSP and CRL with OpenSSL, or use a hosted checker. Commands included.",
      intro:
        "Expiry is not the only way a certificate dies: CAs revoke certificates after key compromise or mis-issuance. Clients check revocation through OCSP (a live status query) or CRLs (signed lists of revoked serials). Here is how to check both by hand.",
      sections: [
        {
          heading: "OCSP with OpenSSL",
          body: [
            "Find the responder with openssl x509 -in cert.pem -noout -ocsp_uri. Then query it: openssl ocsp -issuer intermediate.pem -cert cert.pem -url RESPONDER_URL -resp_text. The -issuer file must be the certificate that signed yours. A healthy answer ends with cert.pem: good.",
            "If the responder is unreachable or returns an error, treat the result as unknown rather than good. Soft-fail open is exactly how revoked certificates slip through unnoticed.",
          ],
        },
        {
          heading: "CRL the manual way",
          body: [
            "List the distribution points with openssl x509 -in cert.pem -noout -text and look for the CRL Distribution Points section. Download the CRL, then inspect it with openssl crl -inform DER -in crl.der -text -noout and compare the revoked serials against openssl x509 -in cert.pem -noout -serial.",
            "CRLs can be large and go stale. Always check the Next Update field: a CRL older than its next update tells you nothing about recent revocations.",
          ],
        },
        {
          heading: "Shortcuts: stapling and hosted checkers",
          body: [
            "For a live server, openssl s_client -connect example.com:443 -servername example.com -status shows whether the server staples an OCSP response. Look for OCSP Response Status: successful in the output.",
            "When you want an answer without the plumbing, a hosted checker queries OCSP and CRL for you from real vantage points.",
          ],
        },
      ],
      toolCta: "Check revocation online",
    },
    it: {
      title: "Come verificare la revoca OCSP e CRL",
      description:
        "Verifica che un certificato non sia revocato via OCSP e CRL con OpenSSL, o usa un servizio online. Comandi inclusi.",
      intro:
        "La scadenza non è l'unico modo in cui un certificato muore: le CA revocano dopo compromissioni o emissioni errate. I client verificano via OCSP (query live) o CRL (liste firmate dei seriali revocati). Ecco come controllarle a mano.",
      sections: [
        {
          heading: "OCSP con OpenSSL",
          body: [
            "Trova il responder con openssl x509 -in cert.pem -noout -ocsp_uri. Poi interroga: openssl ocsp -issuer intermediate.pem -cert cert.pem -url RESPONDER_URL -resp_text. Il file -issuer deve essere il certificato che ha firmato il tuo. Una risposta sana finisce con cert.pem: good.",
            "Se il responder non risponde o dà errore, considera il risultato sconosciuto, non buono. Il soft-fail è proprio il modo in cui i certificati revocati passano inosservati.",
          ],
        },
        {
          heading: "CRL manuale",
          body: [
            "Elenca i distribution point con openssl x509 -in cert.pem -noout -text cercando la sezione CRL Distribution Points. Scarica la CRL e ispezionala con openssl crl -inform DER -in crl.der -text -noout, confrontando i seriali revocati con openssl x509 -in cert.pem -noout -serial.",
            "Le CRL possono essere grandi e datate. Controlla sempre il campo Next Update: una CRL più vecchia del suo next update non dice nulla sulle revoche recenti.",
          ],
        },
        {
          heading: "Scorciatoie: stapling e servizi online",
          body: [
            "Per un server live, openssl s_client -connect example.com:443 -servername example.com -status mostra se il server pinza (stapling) una risposta OCSP. Cerca OCSP Response Status: successful nell'output.",
            "Se vuoi una risposta senza tubature, un servizio online interroga OCSP e CRL per te da punti di osservazione reali.",
          ],
        },
      ],
      toolCta: "Verifica la revoca online",
    },
  },
  {
    slug: "search-certificate-transparency",
    toolSlug: undefined,
    externalTool: { name: "crt.sh", url: "https://crt.sh/" },
    en: {
      title: "How to search Certificate Transparency logs",
      description:
        "Find every public certificate issued for your domain with crt.sh, spot rogue issuance, and set up monitoring.",
      intro:
        "Every public CA must log issued certificates to Certificate Transparency logs. That makes CT the authoritative inventory of what exists for your domain, including certificates you never asked for.",
      sections: [
        {
          heading: "Search your domain on crt.sh",
          body: [
            "Open https://crt.sh/?q=%25.example.com (the %25 is a % wildcard, so subdomains are included). Each row is a logged certificate: check the issuer, the validity window, and whether you recognize the request.",
            "Anything you do not recognize deserves investigation: contact the issuing CA, since only the CA can explain (or revoke) a mis-issuance.",
          ],
        },
        {
          heading: "What to look for",
          body: [
            "Focus on surprises: issuers you never used, wildcard certificates you never requested, and validity windows that do not match your issuance process. Precertificates (logged before issuance) count too: they reveal intent even if the final certificate never ships.",
            "Remember the blind spot: CT covers public certificates only. Private PKI and internal CAs never appear here.",
          ],
        },
        {
          heading: "Make it continuous",
          body: [
            "One-off searches rot. Monitor new log entries with an alerting service such as Cert Spotter, and keep an inventory of the certificates you own (hostnames plus expiry dates) so triage is a lookup, not archaeology.",
          ],
        },
      ],
      toolCta: "Search crt.sh",
    },
    it: {
      title: "Come cercare nei log Certificate Transparency",
      description:
        "Trova ogni certificato pubblico emesso per il tuo dominio con crt.sh, individua emissioni abusive e attiva il monitoraggio.",
      intro:
        "Ogni CA pubblica deve registrare i certificati nei log Certificate Transparency. I CT sono quindi l'inventario autorevole di ciò che esiste per il tuo dominio, inclusi certificati mai richiesti.",
      sections: [
        {
          heading: "Cerca il dominio su crt.sh",
          body: [
            "Apri https://crt.sh/?q=%25.example.com (il %25 è una wildcard %, quindi include i sottodomini). Ogni riga è un certificato registrato: controlla emittente, finestra di validità e se riconosci la richiesta.",
            "Tutto ciò che non riconosci merita un'indagine: contatta la CA emittente, perché solo la CA può spiegare (o revocare) un'emissione anomala.",
          ],
        },
        {
          heading: "Cosa cercare",
          body: [
            "Concentrati sulle sorprese: emittenti mai usati, wildcard mai richiesti, validità incoerenti col tuo processo di emissione. Anche i precertificati (registrati prima dell'emissione) contano: rivelano l'intento anche se il certificato finale non esce mai.",
            "Ricorda il punto cieco: i CT coprono solo i certificati pubblici. PKI private e CA interne non compaiono mai qui.",
          ],
        },
        {
          heading: "Rendilo continuo",
          body: [
            "Le ricerche una tantum invecchiano. Monitora le nuove registrazioni con un servizio di alert come Cert Spotter e mantieni un inventario dei certificati posseduti (hostname più scadenze), così il triage è una ricerca, non archeologia.",
          ],
        },
      ],
      toolCta: "Cerca su crt.sh",
    },
  },
  {
    slug: "check-tls-versions-ciphers",
    toolSlug: undefined,
    externalTool: { name: "Qualys SSL Labs", url: "https://www.ssllabs.com/ssltest/" },
    en: {
      title: "How to check TLS versions and cipher suites",
      description:
        "Probe which TLS versions and ciphers a server really negotiates with OpenSSL, then grade it. Commands included.",
      intro:
        "Configuration files state intent; the handshake states fact. Probing each protocol version and cipher family shows what a server actually negotiates, including legacy versions you thought were disabled.",
      sections: [
        {
          heading: "Probe protocol versions",
          body: [
            "openssl s_client -connect example.com:443 -servername example.com -tls1_2 asks explicitly for TLS 1.2; look for Protocol : TLSv1.2 in the output. Repeat with -tls1_3. Probes for TLS 1.0 and 1.1 should fail outright on any modern server.",
            "Always pass -servername: without SNI you may test the default virtual host instead of the site you care about.",
          ],
        },
        {
          heading: "Probe cipher suites",
          body: [
            "Restrict the offer and see what survives, for example openssl s_client -connect example.com:443 -servername example.com -tls1_2 -cipher ECDHE-RSA-AES128-GCM-SHA256, then read the Cipher is line. Repeat the pattern for the families you allow, and confirm weak ones (RC4, 3DES, export ciphers) fail.",
            "Prefer AEAD suites with forward secrecy (ECDHE + GCM or ChaCha20-Poly1305) and disable everything else server-side rather than relying on client preferences.",
          ],
        },
        {
          heading: "Grade it properly",
          body: [
            "Manual probes confirm specifics; a full grader checks everything at once, including chain issues, HSTS, and known vulnerabilities. For repeatable self-hosted scans, testssl.sh gives the same depth from your own shell.",
          ],
        },
      ],
      toolCta: "Grade the server with SSL Labs",
    },
    it: {
      title: "Come verificare versioni TLS e cipher suite",
      description:
        "Verifica quali versioni TLS e cipher un server negozia davvero con OpenSSL, poi dagli un voto. Comandi inclusi.",
      intro:
        "I file di configurazione dichiarano intenzioni; l'handshake dichiara fatti. Provare ogni versione e famiglia di cipher mostra cosa il server negozia davvero, incluse versioni legacy che credevi disabilitate.",
      sections: [
        {
          heading: "Prova le versioni di protocollo",
          body: [
            "openssl s_client -connect example.com:443 -servername example.com -tls1_2 chiede esplicitamente TLS 1.2; cerca Protocol : TLSv1.2 nell'output. Ripeti con -tls1_3. Le prove per TLS 1.0 e 1.1 devono fallire su qualsiasi server moderno.",
            "Passa sempre -servername: senza SNI potresti testare il virtual host di default invece del sito che ti interessa.",
          ],
        },
        {
          heading: "Prova le cipher suite",
          body: [
            "Limita l'offerta e vedi cosa sopravvive, ad esempio openssl s_client -connect example.com:443 -servername example.com -tls1_2 -cipher ECDHE-RSA-AES128-GCM-SHA256, poi leggi la riga Cipher is. Ripeti per le famiglie consentite e conferma che quelle deboli (RC4, 3DES, cipher export) falliscano.",
            "Preferisci suite AEAD con forward secrecy (ECDHE + GCM o ChaCha20-Poly1305) e disabilita il resto lato server invece di affidarti alle preferenze dei client.",
          ],
        },
        {
          heading: "Dai un voto serio",
          body: [
            "Le prove manuali confermano i dettagli; un grader completo controlla tutto insieme, inclusi problemi di catena, HSTS e vulnerabilità note. Per scansioni ripetibili in casa, testssl.sh dà la stessa profondità dalla tua shell.",
          ],
        },
      ],
      toolCta: "Valuta il server con SSL Labs",
    },
  },
  {
    slug: "check-hsts",
    toolSlug: undefined,
    externalTool: { name: "HSTS Preload", url: "https://hstspreload.org/" },
    en: {
      title: "How to check HSTS (and join the preload list)",
      description:
        "Read the Strict-Transport-Security header, understand max-age and preload, and submit your domain. Commands included.",
      intro:
        "HSTS tells browsers to use HTTPS only for your domain, closing the downgrade window that makes the first visit vulnerable. The preload list bakes that decision into browsers themselves, so even the first visit is protected.",
      sections: [
        {
          heading: "Read the header",
          body: [
            "curl -sI https://example.com | grep -i strict-transport-security prints the policy. A complete answer looks like Strict-Transport-Security: max-age=31536000; includeSubDomains; preload. Without curl, the same header is visible through openssl s_client with a manual HEAD request.",
            "Check HTTPS on every subdomain too before claiming includeSubDomains: one plain-HTTP subdomain breaks visitors the moment the flag goes live.",
          ],
        },
        {
          heading: "What each directive means",
          body: [
            "max-age is the memory in seconds (31536000 is one year). includeSubDomains extends the rule to every subdomain. preload is a flag that says the domain may be submitted to the browser preload list. None of them fix mixed content: HTTPS-only pages must not load HTTP subresources.",
          ],
        },
        {
          heading: "Submit to the preload list",
          body: [
            "Preload requires HTTPS everywhere (including all subdomains), max-age of at least 31536000, plus the includeSubDomains and preload flags, plus a redirect from HTTP to HTTPS. Removal from the list is slow by design, so submit only when the setup is stable.",
          ],
        },
      ],
      toolCta: "Check preload status",
    },
    it: {
      title: "Come verificare HSTS (e entrare nella preload list)",
      description:
        "Leggi l'header Strict-Transport-Security, capisci max-age e preload, e invia il dominio. Comandi inclusi.",
      intro:
        "HSTS dice ai browser di usare solo HTTPS per il tuo dominio, chiudendo la finestra di downgrade che rende vulnerabile la prima visita. La preload list cuce quella decisione nei browser, così anche la prima visita è protetta.",
      sections: [
        {
          heading: "Leggi l'header",
          body: [
            "curl -sI https://example.com | grep -i strict-transport-security stampa la policy. Una risposta completa è Strict-Transport-Security: max-age=31536000; includeSubDomains; preload. Senza curl, lo stesso header si vede con openssl s_client e una richiesta HEAD manuale.",
            "Verifica HTTPS su ogni sottodominio prima di dichiarare includeSubDomains: un solo sottodominio in HTTP rompe i visitatori appena il flag va live.",
          ],
        },
        {
          heading: "Cosa significa ogni direttiva",
          body: [
            "max-age è la memoria in secondi (31536000 è un anno). includeSubDomains estende la regola a ogni sottodominio. preload è il flag che autorizza l'invio alla preload list dei browser. Nessuna direttiva risolve il mixed content: le pagine HTTPS non devono caricare sottorisorse HTTP.",
          ],
        },
        {
          heading: "Invia alla preload list",
          body: [
            "Il preload richiede HTTPS ovunque (tutti i sottodomini inclusi), max-age di almeno 31536000, i flag includeSubDomains e preload, e il redirect da HTTP a HTTPS. La rimozione è lenta per disegno: invia solo a setup stabile.",
          ],
        },
      ],
      toolCta: "Verifica lo stato preload",
    },
  },
  {
    slug: "check-server-certificate-expiry",
    toolSlug: "renewal-calculator",
    en: {
      title: "How to check a live server certificate expiry",
      description:
        "Read notBefore and notAfter from any TLS server with OpenSSL, script the alert, and plan renewal around the 47-day caps.",
      intro:
        "Expiry outages are embarrassing because they are entirely predictable. Reading the dates straight from the live handshake takes seconds and feeds directly into monitoring and renewal planning.",
      sections: [
        {
          heading: "Read the dates from the handshake",
          body: [
            "echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates prints who the certificate is for, who issued it, and its validity window. The -servername flag matters: without SNI you may read a different virtual host.",
            "For the full chain the server sends, add -showcerts to the s_client call and decode each block the same way.",
          ],
        },
        {
          heading: "Script the alert",
          body: [
            "openssl x509 -noout -checkend 0 exits nonzero when the certificate is already expired, and openssl x509 -noout -checkend 2592000 exits nonzero when it expires within 30 days (2592000 seconds). Wire either into cron or your monitoring and the 3 AM outage becomes a calendar item.",
            "Check every hostname you serve, not just the apex: SAN coverage and expiry are per certificate, and each virtual host can serve a different one.",
          ],
        },
        {
          heading: "Plan the renewal",
          body: [
            "Take the notAfter date to the Renewal Calculator for your renew-by date and your readiness against the shrinking public-TLS caps (200 days, then 100, then 47). Automation stops being optional well before the caps arrive.",
          ],
        },
      ],
      toolCta: "Open the Renewal Calculator",
    },
    it: {
      title: "Come verificare la scadenza del certificato di un server",
      description:
        "Leggi notBefore e notAfter di qualsiasi server TLS con OpenSSL, automatizza l'avviso e pianifica il rinnovo coi cap a 47 giorni.",
      intro:
        "I down per scadenza sono imbarazzanti perché del tutto prevedibili. Leggere le date direttamente dall'handshake live richiede secondi e alimenta monitoraggio e pianificazione.",
      sections: [
        {
          heading: "Leggi le date dall'handshake",
          body: [
            "echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates stampa a chi è intestato il certificato, chi lo ha emesso e la finestra di validità. Il flag -servername conta: senza SNI potresti leggere un altro virtual host.",
            "Per l'intera catena inviata dal server, aggiungi -showcerts alla chiamata s_client e decodifica ogni blocco allo stesso modo.",
          ],
        },
        {
          heading: "Automatizza l'avviso",
          body: [
            "openssl x509 -noout -checkend 0 esce con errore se il certificato è già scaduto, e openssl x509 -noout -checkend 2592000 esce con errore se scade entro 30 giorni (2592000 secondi). Collegalo a cron o al monitoraggio e il down delle 3 di notte diventa una voce di calendario.",
            "Controlla ogni hostname servito, non solo l'apice: copertura SAN e scadenza sono per certificato, e ogni virtual host può servirne uno diverso.",
          ],
        },
        {
          heading: "Pianifica il rinnovo",
          body: [
            "Porta la data notAfter nel Calcolatore Rinnovo per il renew-by e la readiness rispetto ai cap decrescenti (200 giorni, poi 100, poi 47). L'automazione smette di essere opzionale molto prima che i cap arrivino.",
          ],
        },
      ],
      toolCta: "Apri il Calcolatore Rinnovo",
    },
  },
];

export function guideContent(g: Guide, locale: Locale): GuideContent {
  return locale === "it" ? g.it : g.en;
}
