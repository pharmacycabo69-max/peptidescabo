/* Peptides Cabo — lightweight on-page FAQ assistant.
   Client-side only: matches visitor questions against FAQ_DATA (assets/js/faq-data.js)
   using simple keyword overlap scoring. No external API calls, no data leaves the browser. */
(function () {
  "use strict";

  var STOPWORDS = new Set([
    "the","a","an","is","are","was","were","do","does","did","i","you","your","my","me",
    "to","of","in","on","for","and","or","with","what","whats","how","can","will","it",
    "be","as","at","by","if","this","that","these","those","about","have","has","need",
    "should","would","could","there","here","not","no","yes","get","getting","much","many"
  ]);

  var SYNONYMS = {
    "cost": "price", "costs": "price", "expensive": "price", "pricing": "price", "prices": "price",
    "insurance": "insurance", "covered": "insurance", "coverage": "insurance",
    "begin": "start", "started": "start", "starting": "start", "book": "start", "booking": "start",
    "safe": "safety", "danger": "safety", "dangerous": "safety", "risk": "safety", "risky": "safety",
    "effects": "sideeffects", "side": "sideeffects",
    "difference": "compare", "versus": "compare", "vs": "compare", "between": "compare",
    "ship": "delivery", "shipping": "delivery", "deliver": "delivery", "pickup": "delivery"
  };

  function tokenize(str) {
    return (str.toLowerCase().match(/[a-z0-9]+/g) || []).filter(function (w) {
      return w.length > 2 && !STOPWORDS.has(w);
    }).map(function (w) { return SYNONYMS[w] || w; });
  }

  function scoreEntry(queryTokens, entry) {
    var haystack = tokenize(entry.q + " " + entry.a);
    var haySet = {};
    haystack.forEach(function (w) { haySet[w] = (haySet[w] || 0) + 1; });
    var score = 0;
    queryTokens.forEach(function (w) {
      if (haySet[w]) score += 2;
      // partial/stem match (e.g. "peptides" vs "peptide")
      else if (haystack.some(function (h) { return h.indexOf(w) === 0 || w.indexOf(h) === 0; })) score += 1;
    });
    return score;
  }

  function findBestAnswer(query) {
    if (typeof FAQ_DATA === "undefined" || !FAQ_DATA.length) return null;
    var qTokens = tokenize(query);
    if (!qTokens.length) return null;
    var best = null, bestScore = 0;
    FAQ_DATA.forEach(function (entry) {
      var s = scoreEntry(qTokens, entry);
      if (s > bestScore) { bestScore = s; best = entry; }
    });
    return bestScore >= 2 ? best : null;
  }

  var SUGGESTIONS = [
    "How much weight can I expect to lose?",
    "What's the difference between semaglutide and tirzepatide?",
    "Do you accept insurance?",
    "How do I get started?"
  ];

  document.addEventListener("DOMContentLoaded", function () {
    var bubble = document.getElementById("chatbotBubble");
    var panel = document.getElementById("chatbotPanel");
    var messagesEl = document.getElementById("chatbotMessages");
    var suggestionsEl = document.getElementById("chatbotSuggestions");
    var form = document.getElementById("chatbotForm");
    var input = document.getElementById("chatbotInput");
    if (!bubble || !panel || !form) return;

    var greeted = false;

    function addMessage(text, who) {
      var row = document.createElement("div");
      row.className = "chat-msg " + (who === "user" ? "chat-msg-user" : "chat-msg-bot");
      var bubbleEl = document.createElement("div");
      bubbleEl.className = "chat-bubble";
      bubbleEl.textContent = text;
      row.appendChild(bubbleEl);
      messagesEl.appendChild(row);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return row;
    }

    function renderSuggestions(list) {
      suggestionsEl.innerHTML = "";
      list.forEach(function (q) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chat-chip";
        chip.textContent = q;
        chip.addEventListener("click", function () { handleQuery(q); });
        suggestionsEl.appendChild(chip);
      });
    }

    function showTyping() {
      var row = document.createElement("div");
      row.className = "chat-msg chat-msg-bot chat-typing";
      row.innerHTML = '<div class="chat-bubble"><span></span><span></span><span></span></div>';
      messagesEl.appendChild(row);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return row;
    }

    function handleQuery(text) {
      text = (text || "").trim();
      if (!text) return;
      addMessage(text, "user");
      input.value = "";
      var typingRow = showTyping();
      setTimeout(function () {
        typingRow.remove();
        var match = findBestAnswer(text);
        if (match) {
          addMessage(match.a, "bot");
        } else {
          addMessage(
            "I don't have an exact answer for that. Our team can help directly — book a free consultation or reach out on WhatsApp/email from the Contact page.",
            "bot"
          );
        }
        renderSuggestions(pickSuggestions());
      }, 500 + Math.random() * 400);
    }

    function pickSuggestions() {
      // rotate through a few different starter questions so it doesn't feel static
      var pool = SUGGESTIONS.slice();
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
      }
      return pool.slice(0, 3);
    }

    function openPanel() {
      panel.classList.add("open");
      bubble.classList.add("open");
      bubble.setAttribute("aria-label", "Close chat assistant");
      if (!greeted) {
        greeted = true;
        addMessage("Hi! I'm the Peptides Cabo assistant. Ask me about pricing, semaglutide vs. tirzepatide, safety, or how treatment works.", "bot");
        renderSuggestions(SUGGESTIONS.slice(0, 3));
      }
      setTimeout(function () { input.focus(); }, 250);
    }

    function closePanel() {
      panel.classList.remove("open");
      bubble.classList.remove("open");
      bubble.setAttribute("aria-label", "Open chat assistant");
    }

    bubble.addEventListener("click", function () {
      panel.classList.contains("open") ? closePanel() : openPanel();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      handleQuery(input.value);
    });
  });
})();
