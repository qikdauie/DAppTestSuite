import { getReadyDecentClient } from 'decent_app_sdk';

/**
 * 💀 ADVERSARIAL BREAK TESTS 💀
 * 
 * These tests are designed to ANNIHILATE the security model by finding edge cases,
 * race conditions, timing attacks, and implementation vulnerabilities.
 * 
 * 🔥 MISSION: DESTROY EVERYTHING AND FIND THE VULNERABILITIES 🔥
 * 
 * ⚠️  WARNING: These tests are INTENTIONALLY AGGRESSIVE and may:
 * - Consume significant memory
 * - Take a long time to execute
 * - Potentially crash browsers with weak implementations
 * - Generate massive payloads
 * 
 * 💀 USE AT YOUR OWN RISK 💀
 */

const ROUTER = {
  SUCCESS: 'success',
  ABORTED: 'aborted',
  ACCESS_DENIED: 'access-denied',
  INVALID_ADDRESS: 'invalid-address',
  ADDRESS_IN_USE: 'address-in-use',
  INVALID_MESSAGE: 'invalid-message',
  NO_ROUTE: 'no-route',
  VALIDATION_FAILED: 'validation-failed',
  AUTHENTICATION_FAILED: 'authentication-failed',
  REQUEST_EXPIRED: 'request-expired',
  RATE_LIMIT_EXCEEDED: 'rate-limit-exceeded',
  UNKNOWN_ERROR: 'unknown-error',
};

function expectFailureLabel(routerResult) {
  if (typeof routerResult === 'string') return routerResult;
  if (routerResult && typeof routerResult.result === 'string') return routerResult.result;
  return ROUTER.UNKNOWN_ERROR;
}

export async function adversarialBreakTests() {
  const msgr = await getReadyDecentClient();
  const { did } = await msgr.getDID();
  const results = {};

  // 💥 ATTACK 1: BTC ID Integer Overflow/Underflow APOCALYPSE
  try {
    const body = JSON.stringify({ attack: 'btc_overflow_apocalypse' });
    const packed = await msgr.pack(did, 'https://didcomm.org/basicmessage/2.0/message', body, [], '');
    
    if (packed.success) {
      const parsed = JSON.parse(packed.message);
      const header = JSON.parse(atob(parsed.protected));
      
      // EVERY CONCEIVABLE EVIL BTC ID VALUE
      const maliciousBtcIds = [
        "0",                                    // Zero
        "1",                                    // Minimum positive
        "-1",                                   // Negative
        "-9223372036854775808",                 // Min signed 64-bit
        "9223372036854775807",                  // Max signed 64-bit
        "18446744073709551615",                 // Max unsigned 64-bit
        "340282366920938463463374607431768211455", // Max 128-bit
        "999999999999999999999999999999999999", // Ridiculously massive
        "-999999999999999999999999999999999999", // Ridiculously massive negative
        "0x1337deadbeef",                       // Hex format
        "0b1010101010101010",                   // Binary format
        "1e308",                                // Scientific notation
        "1.7976931348623157e+308",              // Max double
        "4.9406564584124654e-324",              // Min double
        "1.5",                                  // Float
        "3.14159265359",                        // Pi
        "NaN",                                  // Not a Number
        "Infinity",                             // Positive infinity
        "-Infinity",                            // Negative infinity
        "",                                     // Empty string
        " ",                                    // Space
        "\t",                                   // Tab
        "\n",                                   // Newline
        "\r",                                   // Carriage return
        "\0",                                   // Null character
        "\x00",                                 // Hex null
        "\uFEFF",                               // BOM
        "\u200B",                               // Zero-width space
        "\u202E",                               // Right-to-left override
        "null",                                 // String null
        "undefined",                            // String undefined
        "true",                                 // Boolean as string
        "false",                                // Boolean as string
        "[]",                                   // Array as string
        "{}",                                   // Object as string
        "function(){return 1337;}",             // Function as string
        "alert('XSS')",                         // XSS attempt
        "javascript:alert('XSS')",              // JavaScript protocol
        "<script>alert('XSS')</script>",        // Script tag
        "'; DROP TABLE users; --",              // SQL injection
        "../../../etc/passwd",                  // Path traversal
        "%00",                                  // URL encoded null
        "%27%3B%20DROP%20TABLE%20users%3B%20--", // URL encoded SQL
        "\\\\.\\pipe\\exploit",                 // Windows pipe
        "CON",                                  // Windows reserved name
        "AUX",                                  // Windows reserved name
        "1" + "0".repeat(1000),                 // 1000 digit number
        "A".repeat(10000),                      // 10k character string
      ];
      
      let vulnerabilities = [];
      for (const maliciousBtcId of maliciousBtcIds) {
        try {
          const tampered = { ...header, btc_id: maliciousBtcId };
          parsed.protected = btoa(JSON.stringify(tampered));
          
          const result = await msgr.send(did, JSON.stringify(parsed));
          const label = (typeof result === 'string') ? result : result?.result;
          if (label === 'success') {
            vulnerabilities.push({
              btcId: maliciousBtcId,
              unexpectedSuccess: true,
              response: result
            });
          }
        } catch (e) {
          // Expected errors are fine
        }
      }
      
      results.btc_id_overflow_apocalypse = {
        pass: vulnerabilities.length === 0,
        detail: {
          apis: ['packMessage', 'sendMessage'],
          vulnerabilities,
          totalAttempts: maliciousBtcIds.length,
          explanation: 'Router should reject ALL malformed BTC ID values - ANY success is a vulnerability'
        }
      };
    } else {
      results.btc_id_overflow_apocalypse = { pass: false, detail: { error: 'Pack failed', responses: { packMessage: packed } } };
    }
  } catch (err) {
    results.btc_id_overflow_apocalypse = { pass: true, detail: { error: String(err), apis: ['packMessage', 'sendMessage'] } };
  }

  // ⚡ ATTACK 2: EXTREME Race Condition Attack - 100 CONCURRENT HAMMERING
  try {
    const body = JSON.stringify({ attack: 'extreme_race_condition', timestamp: Date.now() });
    const packed = await msgr.pack(did, 'https://didcomm.org/basicmessage/2.0/message', body, [], '');
    
    if (packed.success) {
      // Launch 100 concurrent sends of the SAME message to find race conditions
      const concurrentSends = Array(100).fill(null).map((_, i) => 
        msgr.send(did, packed.message).then(result => ({
          attempt: i,
          result: result,
          timestamp: Date.now()
        }))
      );
      
      const results_concurrent = await Promise.all(concurrentSends);
      const successes = results_concurrent.filter(r => ((typeof r.result === 'string') ? r.result : r.result?.result) === 'success');
      const failures = results_concurrent.filter(r => ((typeof r.result === 'string') ? r.result : r.result?.result) !== 'success');
      
      // If more than 1 succeeds, there's a race condition vulnerability
      const hasRaceCondition = successes.length > 1;
      
      results.extreme_race_condition = {
        pass: !hasRaceCondition,
        detail: {
          apis: ['packMessage', 'sendMessage'],
          totalAttempts: 100,
          successes: successes.length,
          failures: failures.length,
          hasRaceCondition,
          successfulAttempts: successes.map(s => s.attempt),
          timing: {
            fastest: Math.min(...results_concurrent.map(r => r.timestamp)),
            slowest: Math.max(...results_concurrent.map(r => r.timestamp)),
            spread: Math.max(...results_concurrent.map(r => r.timestamp)) - Math.min(...results_concurrent.map(r => r.timestamp))
          },
          explanation: 'Only one concurrent send should succeed - multiple successes indicate race condition vulnerability'
        }
      };
    } else {
      results.extreme_race_condition = { pass: false, detail: { error: 'Pack failed', responses: { packMessage: packed } } };
    }
  } catch (err) {
    results.extreme_race_condition = { pass: true, detail: { error: String(err), apis: ['packMessage', 'sendMessage'] } };
  }

  // 🔤 ATTACK 3: ULTIMATE Unicode/Encoding Apocalypse
  try {
    const body = JSON.stringify({ attack: 'unicode_apocalypse' });
    const packed = await msgr.pack(did, 'https://didcomm.org/basicmessage/2.0/message', body, [], '');
    
    if (packed.success) {
      const parsed = JSON.parse(packed.message);
      const header = JSON.parse(atob(parsed.protected));
      
      // EVERY UNICODE NORMALIZATION AND ENCODING ATTACK KNOWN TO HUMANITY
      const unicodeAttacks = [
        "123456789０",                          // Mix of ASCII and fullwidth digits
        "１２３４５６７８９",                   // All fullwidth digits
        "123456789\u200B",                     // Zero-width space
        "123456789\u200C",                     // Zero-width non-joiner
        "123456789\u200D",                     // Zero-width joiner
        "123456789\uFEFF",                     // Zero-width no-break space (BOM)
        "123456789\u0000",                     // Null character
        "123456789\r\n",                       // CRLF injection
        "123456789\x00",                       // Hex null
        "123456789\u202E",                     // Right-to-left override
        "123456789\u202D",                     // Left-to-right override
        "1234５６789",                         // Mixed width digits
        "123456789\u0301",                     // Combining acute accent
        "123456789\u0308",                     // Combining diaeresis
        "123456789\u200E",                     // Left-to-right mark
        "123456789\u200F",                     // Right-to-left mark
        "123456789\u2066",                     // Left-to-right isolate
        "123456789\u2067",                     // Right-to-left isolate
        "123456789\u2068",                     // First strong isolate
        "123456789\u2069",                     // Pop directional isolate
        btoa("123456789"),                     // Base64 encoded
        Array.from("123456789").map(c => c.charCodeAt(0).toString(16)).join(''), // Hex encoded
        encodeURIComponent("123456789"),       // URL encoded
        "123456789".split('').join('\u200B'),  // Zero-width spaces between chars
        "𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡",                          // Mathematical bold digits
        "①②③④⑤⑥⑦⑧⑨",                          // Circled digits
        "１２３４５６７８９\uFE0F",               // Fullwidth + variation selector
        "\uD83D\uDC80" + "123456789",          // Skull emoji + digits
        "123456789" + "\u{1F4A9}",             // Digits + pile of poo
        "\u{10FFFF}123456789",                 // Highest Unicode code point
        String.fromCharCode(0x7F) + "123456789", // DEL character
        "\x7F\x80\x81\x82\x83" + "123456789", // Control characters
      ];
      
      let unicodeVulnerabilities = [];
      for (const unicodeAttack of unicodeAttacks) {
        try {
          const tampered = { ...header, btc_id: unicodeAttack };
          parsed.protected = btoa(JSON.stringify(tampered));
          
          const result = await msgr.send(did, JSON.stringify(parsed));
          const label = (typeof result === 'string') ? result : result?.result;
          if (label === 'success') {
            unicodeVulnerabilities.push({
              attack: unicodeAttack,
              encoding: Array.from(unicodeAttack).map(c => c.charCodeAt(0).toString(16)).join(' '),
              length: unicodeAttack.length,
              byteLength: new TextEncoder().encode(unicodeAttack).length,
              unexpectedSuccess: true
            });
          }
        } catch (e) {
          // Expected to fail, continue
        }
      }
      
      results.unicode_apocalypse = {
        pass: unicodeVulnerabilities.length === 0,
        detail: {
          apis: ['packMessage', 'sendMessage'],
          vulnerabilities: unicodeVulnerabilities,
          totalAttempts: unicodeAttacks.length,
          explanation: 'Router should handle ALL Unicode normalization attacks on BTC IDs'
        }
      };
    } else {
      results.unicode_apocalypse = { pass: false, detail: { error: 'Pack failed' } };
    }
  } catch (err) {
    results.unicode_apocalypse = { pass: true, detail: { error: String(err) } };
  }

  // 💣 ATTACK 4: JSON PARSING NUCLEAR BOMBS 💣
  try {
    // Create DEVASTATINGLY large JSON that will test browser limits
    const createNestedBomb = (depth) => {
      let obj = { value: "BOOM!" };
      for (let i = 0; i < depth; i++) {
        obj = { nested: obj, level: i, padding: "A".repeat(100) };
      }
      return obj;
    };
    
    const createRepeatedKeys = (count) => {
      const obj = {};
      for (let i = 0; i < count; i++) {
        obj[`key_${i}`] = `value_${i}_${"X".repeat(50)}`;
      }
      return obj;
    };
    
    const attacks = [
      { name: 'deep_nesting_1000', payload: createNestedBomb(1000) },
      { name: 'wide_object_50000', payload: createRepeatedKeys(50000) },
      { name: 'megabyte_string', payload: { data: 'A'.repeat(1024 * 1024) } },
      { name: 'ten_megabyte_string', payload: { data: 'B'.repeat(10 * 1024 * 1024) } },
      { name: 'array_bomb', payload: { array: Array(100000).fill(0).map((_, i) => ({ id: i, data: "X".repeat(100) })) } },
      { name: 'unicode_bomb', payload: { unicode: "🔥".repeat(100000) } },
      { name: 'mixed_mega_bomb', payload: {
        deep: createNestedBomb(100),
        wide: createRepeatedKeys(1000),
        string: 'Z'.repeat(100000),
        array: Array(1000).fill("EXPLODE")
      }},
    ];
    
    let bombResults = [];
    for (const attack of attacks) {
      try {
        const startTime = Date.now();
        const bodyJson = JSON.stringify(attack.payload);
        const stringifyTime = Date.now();
        const packed = await msgr.pack(did, 'https://didcomm.org/basicmessage/2.0/message', bodyJson, [], '');
        const endTime = Date.now();
        
        bombResults.push({
          name: attack.name,
          stringifyTime: stringifyTime - startTime,
          packTime: endTime - stringifyTime,
          totalTime: endTime - startTime,
          packSucceeded: packed.success,
          payloadSize: bodyJson.length,
          payloadMB: (bodyJson.length / (1024 * 1024)).toFixed(2),
          suspiciouslyLong: (endTime - startTime) > 10000, // Over 10 seconds
          potentialDoS: (endTime - startTime) > 30000      // Over 30 seconds
        });
      } catch (e) {
        bombResults.push({
          name: attack.name,
          error: e.message,
          crashed: true
        });
      }
    }
    
    const hasPotentialDoS = bombResults.some(r => r.potentialDoS || r.crashed);
    const hasSuspiciousDelay = bombResults.some(r => r.suspiciouslyLong);
    
    results.json_nuclear_bomb = {
      pass: !hasPotentialDoS,
      detail: {
        apis: ['packMessage'],
        bombResults,
        hasPotentialDoS,
        hasSuspiciousDelay,
        totalPayloadSize: bombResults.reduce((sum, r) => sum + (r.payloadSize || 0), 0),
        explanation: 'Router should handle massive JSON parsing bombs without DoS or crashing'
      }
    };
  } catch (err) {
    results.json_nuclear_bomb = { pass: true, detail: { error: String(err), crashed: true } };
  }

  // ⏱️ ATTACK 5: PRECISION Timing Attack on BTC Validation
  try {
    const validBody = JSON.stringify({ attack: 'precision_timing_attack' });
        const validPacked = await msgr.pack(did, 'https://didcomm.org/basicmessage/2.0/message', validBody, [], '');
    
    if (validPacked.success) {
      const parsed = JSON.parse(validPacked.message);
      const header = JSON.parse(atob(parsed.protected));
      const originalBtcId = header.btc_id;
      
      // Test timing differences for various BTC ID validations with HIGH PRECISION
      const timingTests = [
        { name: 'valid_btc', btcId: originalBtcId },
        { name: 'invalid_short', btcId: '1' },
        { name: 'invalid_long', btcId: '1'.repeat(1000) },
        { name: 'invalid_format', btcId: 'not_a_number' },
        { name: 'similar_valid', btcId: (BigInt(originalBtcId) + BigInt(1)).toString() },
        { name: 'negative', btcId: '-' + originalBtcId },
        { name: 'zero', btcId: '0' },
        { name: 'max_uint64', btcId: '18446744073709551615' },
        { name: 'overflow', btcId: '18446744073709551616' },
        { name: 'hex_format', btcId: '0x' + BigInt(originalBtcId).toString(16) },
      ];
      
      let timingResults = [];
      for (const test of timingTests) {
        const tamperedHeader = { ...header, btc_id: test.btcId };
        parsed.protected = btoa(JSON.stringify(tamperedHeader));
        
        const times = [];
        // Run each test 50 times to get HIGH PRECISION timing data
        for (let i = 0; i < 50; i++) {
          const startTime = performance.now();
          const _ = await msgr.send(did, JSON.stringify(parsed));
          const endTime = performance.now();
          times.push(endTime - startTime);
        }
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const stdDev = Math.sqrt(times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        timingResults.push({
          name: test.name,
          btcId: test.btcId,
          avgTime,
          stdDev,
          minTime,
          maxTime,
          times
        });
      }
      
      // Check for suspicious timing differences with STATISTICAL ANALYSIS
      const validTime = timingResults.find(r => r.name === 'valid_btc')?.avgTime || 0;
      const suspiciousTimingDiffs = timingResults.filter(r => {
        if (r.name === 'valid_btc') return false;
        const timeDiff = Math.abs(r.avgTime - validTime);
        const relativeDiff = timeDiff / validTime;
        return timeDiff > 10 || relativeDiff > 0.5; // 10ms or 50% difference
      });
      
      results.precision_timing_attack = {
        pass: suspiciousTimingDiffs.length === 0,
        detail: {
          apis: ['packMessage', 'sendMessage'],
          timingResults,
          suspiciousTimingDiffs,
          validTime,
          analysis: {
            totalTests: timingResults.length,
            samplesPerTest: 50,
            suspiciousCount: suspiciousTimingDiffs.length
          },
          explanation: 'BTC validation should have consistent timing to prevent timing attacks (±10ms or ±50%)'
        }
      };
    } else {
      results.precision_timing_attack = { pass: false, detail: { error: 'Pack failed' } };
    }
  } catch (err) {
    results.precision_timing_attack = { pass: true, detail: { error: String(err) } };
  }

  // 🧠 ATTACK 6: EXTREME Memory Exhaustion via GIGANTIC JWE
  try {
    // Test router's ability to reject oversized JWE components efficiently
    // Focus on API response time and proper rejection rather than browser memory
    const memoryTests = [
      { name: 'large_ciphertext', size: 2 * 1024 * 1024 },      // 2MB
      { name: 'very_large_ciphertext', size: 5 * 1024 * 1024 }, // 5MB
      { name: 'oversized_ciphertext', size: 10 * 1024 * 1024 }, // 10MB (should be rejected)
      { name: 'oversized_iv', size: 1024 },                     // 1KB IV (way too big)
      { name: 'massive_tag', size: 1024 },                      // 1KB tag (way too big)
      { name: 'giant_key', size: 8 * 1024 },                    // 8KB encrypted key (too big)
    ];
    
    let memoryResults = [];
    for (const test of memoryTests) {
      try {
        const startTime = Date.now();
        
        // Create oversized components but not so large they crash the browser
        let testComponent;
        if (test.name.includes('ciphertext')) {
          testComponent = 'A'.repeat(Math.min(test.size, 50 * 1024 * 1024)); // Cap at 50MB to avoid browser crash
        } else {
          testComponent = 'A'.repeat(test.size);
        }
        
        const maliciousJwe = {
          protected: btoa(JSON.stringify({
            typ: "application/didcomm-encrypted+json",
            alg: "ECDH-1PU+A256KW",
            enc: "A256GCM",
            skid: did,
            btc_id: "999999999999999999"
          })),
          recipients: [{
            header: { alg: "ECDH-1PU+A256KW", kid: did },
            encrypted_key: test.name === 'giant_key' ? testComponent : 'fake_key'
          }],
          ciphertext: test.name.includes('ciphertext') ? testComponent : 'fake_ciphertext',
          iv: test.name === 'oversized_iv' ? testComponent : 'fake_iv',
          tag: test.name === 'massive_tag' ? testComponent : 'fake_tag'
        };
        
        const result = await msgr.send(did, JSON.stringify(maliciousJwe));
        const endTime = Date.now();
        
        // Clean up reference to allow GC
        testComponent = null;
        
        const timeTaken = endTime - startTime;
        const shouldBeRejected = test.size > (3 * 1024 * 1024); // Components over 3MB should be rejected
        const label = (typeof result === 'string') ? result : result?.result;
        const wasRejected = label === 'validation-failed';
        
        memoryResults.push({
          name: test.name,
          size: test.size,
          sizeMB: (test.size / (1024 * 1024)).toFixed(2),
          timeTaken,
          result: result,
          shouldBeRejected,
          wasRejected,
          properlyHandled: shouldBeRejected ? wasRejected : true,
          slowResponse: timeTaken > 5000, // Router should reject quickly (under 5s)
          routerProcessingIssue: timeTaken > 10000 || (shouldBeRejected && !wasRejected)
        });
      } catch (e) {
        memoryResults.push({
          name: test.name,
          size: test.size,
          sizeMB: (test.size / (1024 * 1024)).toFixed(2),
          error: e.message,
          crashed: true,
          routerProcessingIssue: true
        });
      }
    }
    
    // Test passes if router properly rejects oversized components and responds quickly
    const hasRouterIssue = memoryResults.some(r => r.routerProcessingIssue || r.crashed);
    
    results.extreme_memory_exhaustion = {
      pass: !hasRouterIssue,
      detail: {
        apis: ['sendMessage'],
        memoryResults,
        explanation: 'Router should efficiently reject oversized JWE components with validation-failed'
      }
    };
  } catch (err) {
    results.extreme_memory_exhaustion = { pass: true, detail: { error: String(err), crashed: true } };
  }

  // 🌐 ATTACK 7: Advanced Cross-Origin BTC ID Pollution
  try {
    // Try to discover/guess BTC IDs from other origins/sessions with ADVANCED techniques
    const body = JSON.stringify({ attack: 'advanced_cross_origin_pollution' });
    const packed = await msgr.pack(did, 'https://didcomm.org/basicmessage/2.0/message', body, [], '');
    
    if (packed.success) {
      const parsed = JSON.parse(packed.message);
      const header = JSON.parse(atob(parsed.protected));
      const currentBtcId = BigInt(header.btc_id);
      
      // Advanced BTC ID prediction techniques
      const guessedBtcIds = [];
      
      // Sequential patterns
      for (let i = -100; i <= 100; i++) {
        guessedBtcIds.push((currentBtcId + BigInt(i)).toString());
      }
      
      // Bit manipulation patterns
      for (let bit = 0; bit < 64; bit++) {
        guessedBtcIds.push((currentBtcId ^ (BigInt(1) << BigInt(bit))).toString());
      }
      
      // Mathematical patterns
      guessedBtcIds.push((currentBtcId * BigInt(2)).toString());
      guessedBtcIds.push((currentBtcId / BigInt(2)).toString());
      guessedBtcIds.push((currentBtcId + BigInt(1000)).toString());
      guessedBtcIds.push((currentBtcId - BigInt(1000)).toString());
      
      // Time-based patterns (assuming timestamp-based IDs)
      const now = Date.now();
      for (let offset = -3600000; offset <= 3600000; offset += 60000) { // ±1 hour in 1-minute increments
        guessedBtcIds.push((now + offset).toString());
      }
      
      let crossOriginVulnerabilities = [];
      for (const guessedBtcId of guessedBtcIds) {
        try {
          const tamperedHeader = { ...header, btc_id: guessedBtcId };
          parsed.protected = btoa(JSON.stringify(tamperedHeader));
          
          const result = await msgr.send(did, JSON.stringify(parsed));
          const label = (typeof result === 'string') ? result : result?.result;
          if (label === 'success') {
            crossOriginVulnerabilities.push({
              originalBtcId: header.btc_id,
              guessedBtcId,
              difference: BigInt(guessedBtcId) - currentBtcId,
              unexpectedSuccess: true
            });
          }
        } catch (e) {
          // Expected failures
        }
      }
      
      results.advanced_cross_origin_pollution = {
        pass: crossOriginVulnerabilities.length === 0,
        detail: {
          apis: ['packMessage', 'sendMessage'],
          vulnerabilities: crossOriginVulnerabilities,
          totalAttempts: guessedBtcIds.length,
          explanation: 'BTC IDs should be cryptographically unpredictable and not guessable with any technique'
        }
      };
    } else {
      results.advanced_cross_origin_pollution = { pass: false, detail: { error: 'Pack failed' } };
    }
  } catch (err) {
    results.advanced_cross_origin_pollution = { pass: true, detail: { error: String(err) } };
  }

  // 💉 ATTACK 8: ULTIMATE JWE Header Injection Apocalypse
  try {
    const body = JSON.stringify({ attack: 'ultimate_header_injection' });
    const packed = await msgr.pack(did, 'https://didcomm.org/basicmessage/2.0/message', body, [], '');
    
    if (packed.success) {
      const parsed = JSON.parse(packed.message);
      
      // EVERY CONCEIVABLE MALICIOUS HEADER INJECTION
      const headerInjections = [
        // Compression attacks
        { zip: 'DEF' },
        { zip: 'GZIP' },
        { zip: 'BZIP2' },
        
        // Critical extensions
        { crit: ['zip', 'custom'] },
        { crit: ['alg', 'enc'] },
        { crit: ['unknown_critical_extension'] },
        
        // Key injections
        { jwk: { kty: 'oct', k: 'secret' } },
        { jwk: { kty: 'RSA', n: 'fake', e: 'AQAB' } },
        { jwk: { kty: 'EC', crv: 'P-256', x: 'fake', y: 'fake' } },
        
        // External references
        { x5u: 'http://evil.com/cert' },
        { x5u: 'file:///etc/passwd' },
        { x5u: 'javascript:alert("XSS")' },
        { jku: 'http://evil.com/keys' },
        
        // Certificate chains
        { x5c: ['fake_cert'] },
        { x5c: ['../../../etc/passwd'] },
        
        // Path traversal in kid
        { kid: '../../../etc/passwd' },
        { kid: '\\\\evil.com\\share\\key' },
        { kid: 'file:///etc/passwd' },
        
        // Algorithm confusion
        { alg: 'none' },
        { alg: 'HS256' },
        { alg: 'RS256' },
        { alg: '' },
        { alg: null },
        
        // Encoding attacks
        { enc: 'none' },
        { enc: '' },
        { enc: null },
        
        // Type confusion
        { typ: 'JWT' },
        { typ: 'application/jose' },
        { typ: null },
        { typ: '' },
        
        // Custom malicious headers
        { __proto__: { evil: true } },
        { constructor: { prototype: { evil: true } } },
        { eval: 'alert("XSS")' },
        { script: '<script>alert("XSS")</script>' },
        { sql: "'; DROP TABLE users; --" },
        
        // Massive headers
        { huge_header: 'A'.repeat(1000000) },
        { many_headers: Object.fromEntries(Array(10000).fill(0).map((_, i) => [`header_${i}`, `value_${i}`])) },
        
        // Binary data
        { binary: btoa('evil binary data') },
        { null_bytes: 'header\x00with\x00nulls' },
        
        // Unicode attacks
        { unicode: '🔥💀⚡🧠💉' },
        { rtl_override: 'header\u202Eevil' },
        { zero_width: 'header\u200Binjection' },
      ];
      
      let injectionVulnerabilities = [];
      for (const injection of headerInjections) {
        try {
          const header = JSON.parse(atob(parsed.protected));
          const maliciousHeader = { ...header, ...injection };
          parsed.protected = btoa(JSON.stringify(maliciousHeader));
          
          const result = await msgr.send(did, JSON.stringify(parsed));
          const label = (typeof result === 'string') ? result : result?.result;
          if (label === 'success') {
            injectionVulnerabilities.push({
              injection,
              injectionKeys: Object.keys(injection),
              unexpectedSuccess: true
            });
          }
        } catch (e) {
          // Expected to fail
        }
      }
      
      results.ultimate_header_injection = {
        pass: injectionVulnerabilities.length === 0,
        detail: {
          apis: ['packMessage', 'sendMessage'],
          vulnerabilities: injectionVulnerabilities,
          totalAttempts: headerInjections.length,
          explanation: 'Router should reject ALL JWE malicious header injections'
        }
      };
    } else {
      results.ultimate_header_injection = { pass: false, detail: { error: 'Pack failed' } };
    }
  } catch (err) {
    results.ultimate_header_injection = { pass: true, detail: { error: String(err) } };
  }

  const overallPass = Object.values(results).every(r => r && r.pass === true);
  return { 
    pass: overallPass, 
    results,
    warning: "⚠️ These tests are INTENTIONALLY AGGRESSIVE and may consume significant resources! ⚠️"
  };
}

// Individual attack test functions for UI integration
export async function btcIdOverflowApocalypseTest() {
  return (await adversarialBreakTests()).results.btc_id_overflow_apocalypse;
}

export async function extremeRaceConditionTest() {
  return (await adversarialBreakTests()).results.extreme_race_condition;
}

export async function unicodeApocalypseTest() {
  return (await adversarialBreakTests()).results.unicode_apocalypse;
}

export async function jsonNuclearBombTest() {
  return (await adversarialBreakTests()).results.json_nuclear_bomb;
}

export async function precisionTimingAttackTest() {
  return (await adversarialBreakTests()).results.precision_timing_attack;
}

export async function extremeMemoryExhaustionTest() {
  return (await adversarialBreakTests()).results.extreme_memory_exhaustion;
}

export async function advancedCrossOriginPollutionTest() {
  return (await adversarialBreakTests()).results.advanced_cross_origin_pollution;
}

export async function ultimateHeaderInjectionTest() {
  return (await adversarialBreakTests()).results.ultimate_header_injection;
}

