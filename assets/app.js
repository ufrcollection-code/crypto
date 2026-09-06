(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const number = (value) => Number.parseFloat(value);
  const finite = (value) => Number.isFinite(value) && value >= 0;
  const money = (value, digits = 2) => {
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  };
  const signedMoney = (value) => `${value >= 0 ? "+" : "−"}$${money(Math.abs(value))}`;
  const percent = (value) => `${value >= 0 ? "+" : "−"}${money(Math.abs(value), 2)}%`;
  const price = (value) => value < 10 ? money(value, 4) : money(value, 2);

  const formValues = (form) => Object.fromEntries($$('[data-field]', form).map(input => [input.dataset.field, number(input.value)]));

  const setResult = (root, title, cells, note = "Illustrative output. Verify the assumptions before using real-world figures.", tone = "") => {
    root.classList.remove("is-ready", "is-negative");
    root.classList.add("is-ready");
    if (tone === "negative") root.classList.add("is-negative");
    root.innerHTML = `<div class="result-kicker">Calculated view</div><h3>${title}</h3><div class="result-grid">${cells.map(cell => `<div class="result-cell"><span>${cell.label}</span><strong>${cell.value}</strong></div>`).join("")}</div><p class="result-note">${note}</p>`;
  };

  const calculate = (type, values, result) => {
    if (type === "crypto-profit") {
      const { buyPrice, sellPrice, quantity, fees } = values;
      if (![buyPrice, sellPrice, quantity, fees].every(finite) || quantity <= 0 || buyPrice <= 0 || sellPrice < 0) throw new Error("Enter positive prices and a quantity.");
      const grossTurnover = (buyPrice + sellPrice) * quantity;
      const feeCost = grossTurnover * (fees / 100);
      const grossChange = (sellPrice - buyPrice) * quantity;
      const net = grossChange - feeCost;
      const invested = buyPrice * quantity;
      const finalValue = sellPrice * quantity - feeCost;
      setResult(result, net >= 0 ? "The scenario is positive after estimated fees" : "The scenario is negative after estimated fees", [
        { label: "Net result", value: signedMoney(net) },
        { label: "Estimated fees", value: `$${money(feeCost)}` },
        { label: "ROI", value: percent(invested ? (net / invested) * 100 : 0) },
        { label: "Estimated final value", value: `$${money(finalValue)}` }
      ], "Fees are estimated as a percentage of buy and sell turnover. Taxes, slippage, spread and network costs are not included.", net < 0 ? "negative" : "");
      return;
    }

    if (type === "position-size") {
      const { accountBalance, riskPercent, entryPrice, stopPrice } = values;
      if (![accountBalance, riskPercent, entryPrice, stopPrice].every(finite) || accountBalance <= 0 || riskPercent <= 0 || entryPrice <= 0 || stopPrice < 0 || entryPrice === stopPrice) throw new Error("Enter a balance, risk percentage and two different prices.");
      const riskAmount = accountBalance * (riskPercent / 100);
      const distance = Math.abs(entryPrice - stopPrice);
      const units = riskAmount / distance;
      const notional = units * entryPrice;
      setResult(result, "A simple risk-based size", [
        { label: "Cash risk", value: `$${money(riskAmount)}` },
        { label: "Stop distance", value: money(distance, 4) },
        { label: "Estimated units", value: money(units, 4) },
        { label: "Approx. notional", value: `$${money(notional)}` }
      ], "This model assumes one unit loses one price unit across the stop distance. Check contract multipliers, minimum sizes, fees, slippage and currency conversion.");
      return;
    }

    if (type === "dca") {
      const { oldUnits, oldPrice, newUnits, newPrice } = values;
      if (![oldUnits, oldPrice, newUnits, newPrice].every(finite) || oldUnits < 0 || newUnits <= 0 || oldPrice < 0 || newPrice < 0 || oldUnits + newUnits <= 0) throw new Error("Enter units and prices greater than zero for the new purchase.");
      const oldCost = oldUnits * oldPrice;
      const newCost = newUnits * newPrice;
      const totalUnits = oldUnits + newUnits;
      const average = (oldCost + newCost) / totalUnits;
      setResult(result, "A weighted average entry price", [
        { label: "Total units", value: money(totalUnits, 4) },
        { label: "Total cost", value: `$${money(oldCost + newCost)}` },
        { label: "Blended average", value: `$${money(average, 4)}` },
        { label: "New purchase weight", value: percent((newCost / (oldCost + newCost || 1)) * 100) }
      ], "A lower average can still mean more money is exposed to the asset. Fees, taxes and the future price are outside this weighted-average model.");
      return;
    }

    if (type === "pip") {
      const { pips, pipValue, lots } = values;
      if (![pips, pipValue, lots].every(finite) || pips < 0 || pipValue <= 0 || lots <= 0) throw new Error("Enter pips, a pip value and a lot amount.");
      const gross = pips * pipValue * lots;
      setResult(result, "Estimated gross pip value", [
        { label: "Movement", value: `${money(pips, 2)} pips` },
        { label: "Lots", value: money(lots, 2) },
        { label: "Value of move", value: `$${money(gross)}` },
        { label: "Per pip at size", value: `$${money(pipValue * lots)}` }
      ], "The pip-value input must match the pair, contract size and account currency. Spread, commission, funding and slippage are not included.");
      return;
    }

    if (type === "compound") {
      const { principal, monthlyContribution, annualReturn, years } = values;
      if (![principal, monthlyContribution, years].every(finite) || principal < 0 || monthlyContribution < 0 || years <= 0 || !Number.isFinite(annualReturn) || annualReturn <= -100) throw new Error("Enter a positive time horizon and an annual assumption above −100%.");
      const months = years * 12;
      const monthlyRate = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
      const growthFactor = Math.pow(1 + monthlyRate, months);
      const future = monthlyRate === 0 ? principal + monthlyContribution * months : principal * growthFactor + monthlyContribution * ((growthFactor - 1) / monthlyRate);
      const contributed = principal + monthlyContribution * months;
      setResult(result, "A constant-rate growth scenario", [
        { label: "Scenario value", value: `$${money(future)}` },
        { label: "Total contributions", value: `$${money(contributed)}` },
        { label: "Illustrative growth", value: `$${money(future - contributed)}` },
        { label: "Months modelled", value: money(months, 0) }
      ], "This assumes a constant annual rate converted to a monthly rate. Actual returns are uneven; fees, tax, inflation and losses are not included.");
    }
  };

  const initCalculators = () => {
    $$('[data-calculator]').forEach(form => {
      form.addEventListener("submit", event => {
        event.preventDefault();
        const result = form.closest(".calculator-card")?.querySelector("[data-result]");
        if (!result) return;
        try {
          calculate(form.dataset.calculator, formValues(form), result);
        } catch (error) {
          result.classList.remove("is-ready");
          result.innerHTML = `<div class="result-kicker">Check the inputs</div><h3>${error.message}</h3><p>Use positive, non-zero values where the field label requires them.</p>`;
        }
      });
    });
  };

  const markets = [
    { symbol: "BTC/USD", type: "Crypto", price: 64250, move: "+1.8%", accent: "copper" },
    { symbol: "ETH/USD", type: "Crypto", price: 3185.4, move: "−0.6%", accent: "olive" },
    { symbol: "EUR/USD", type: "Forex", price: 1.0842, move: "+0.2%", accent: "sand" },
    { symbol: "GBP/JPY", type: "Forex", price: 191.2, move: "−0.4%", accent: "terracotta" },
    { symbol: "AAPL", type: "Stock", price: 229.6, move: "+0.9%", accent: "gold" },
    { symbol: "MSFT", type: "Stock", price: 411.8, move: "+0.3%", accent: "charcoal" }
  ];
  const paperKey = "cryptostocks-paper-v1";
  const defaultPaper = () => ({ balance: 10000, realized: 0, positions: [] });
  let paperState = defaultPaper();
  let selectedSymbol = markets[0].symbol;

  const readPaperState = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(paperKey) || "null");
      if (saved && Array.isArray(saved.positions)) paperState = { ...defaultPaper(), ...saved };
    } catch (_) {
      paperState = defaultPaper();
    }
  };
  const savePaperState = () => localStorage.setItem(paperKey, JSON.stringify(paperState));
  const market = (symbol) => markets.find(item => item.symbol === symbol) || markets[0];
  const paperUnrealized = () => paperState.positions.reduce((sum, position) => {
    const mark = market(position.symbol).price;
    return sum + (position.side === "long" ? mark - position.entry : position.entry - mark) * position.quantity;
  }, 0);
  const paperEquity = () => paperState.balance + paperState.realized + paperUnrealized();

  const renderMarketWatch = () => {
    const list = $("[data-instrument-list]");
    const select = $("[data-paper-instrument]");
    if (!list || !select) return;
    list.innerHTML = markets.map(item => {
      const selected = item.symbol === selectedSymbol ? " is-selected" : "";
      const direction = item.move.startsWith("+") ? "up" : "down";
      return `<button class="instrument${selected}" type="button" data-select-market="${item.symbol}"><span class="instrument-mark ${item.accent}">${item.symbol.slice(0, 1)}</span><span class="instrument-name"><strong>${item.symbol}</strong><small>${item.type}</small></span><span class="instrument-price"><strong>${price(item.price)}</strong><small class="${direction}">${item.move}</small></span></button>`;
    }).join("");
    select.innerHTML = markets.map(item => {
      const selected = item.symbol === selectedSymbol ? " selected" : "";
      return `<option value="${item.symbol}"${selected}>${item.symbol} · ${item.type}</option>`;
    }).join("");
    $$('[data-select-market]').forEach(button => button.addEventListener("click", () => {
      selectedSymbol = button.dataset.selectMarket;
      syncSelectedMarket();
    }));
  };

  const syncSelectedMarket = () => {
    const select = $("[data-paper-instrument]");
    if (select) select.value = selectedSymbol;
    const item = market(selectedSymbol);
    const priceNode = $("[data-paper-price]");
    const symbolNode = $("[data-paper-symbol]");
    if (priceNode) priceNode.textContent = price(item.price);
    if (symbolNode) symbolNode.textContent = `${item.symbol} · ${item.type} · sample price`;
    $$('[data-select-market]').forEach(button => button.classList.toggle("is-selected", button.dataset.selectMarket === selectedSymbol));
  };

  const renderPaperPositions = () => {
    const body = $("[data-paper-positions]");
    const balance = $("[data-paper-balance]");
    if (!body || !balance) return;
    balance.textContent = `$${money(paperEquity())}`;
    if (!paperState.positions.length) {
      body.innerHTML = '<tr><td colspan="7" class="empty-state">No practice positions yet. Choose an instrument and write your plan.</td></tr>';
      return;
    }
    body.innerHTML = paperState.positions.map(position => {
      const current = market(position.symbol).price;
      const pnl = (position.side === "long" ? current - position.entry : position.entry - current) * position.quantity;
      const tone = pnl >= 0 ? "pnl-up" : "pnl-down";
      return `<tr><td><strong>${position.symbol}</strong></td><td><span class="side-pill ${position.side}">${position.side}</span></td><td>${money(position.quantity, 4)}</td><td>${price(position.entry)}</td><td>${price(current)}</td><td class="${tone}">${signedMoney(pnl)}</td><td><button class="close-position" type="button" data-close-position="${position.id}">Close</button></td></tr>`;
    }).join("");
    $$('[data-close-position]').forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.closePosition;
      const position = paperState.positions.find(item => item.id === id);
      if (!position) return;
      const current = market(position.symbol).price;
      const pnl = (position.side === "long" ? current - position.entry : position.entry - current) * position.quantity;
      paperState.realized += pnl;
      paperState.positions = paperState.positions.filter(item => item.id !== id);
      savePaperState();
      renderPaperPositions();
      showPaperMessage(`Closed ${position.side} ${position.symbol}: ${signedMoney(pnl)} on the sample mark.`, pnl < 0 ? "error" : "success");
    }));
  };

  const showPaperMessage = (message, type = "") => {
    const node = $("[data-paper-message]");
    if (!node) return;
    node.textContent = message;
    node.className = `form-message ${type}`;
  };

  const initQuiz = () => {
    $$('[data-quiz]').forEach(quiz => {
      const submit = $("[data-quiz-submit]", quiz);
      const result = $("[data-quiz-result]", quiz);
      submit?.addEventListener("click", () => {
        const questions = $$('[data-question]', quiz);
        let answered = 0;
        let score = 0;
        questions.forEach(question => {
          const selected = $("input:checked", question);
          question.classList.remove("is-correct", "is-wrong");
          if (!selected) return;
          answered += 1;
          const correct = Number(selected.value) === Number(question.dataset.answer);
          if (correct) score += 1;
          question.classList.add(correct ? "is-correct" : "is-wrong");
        });
        if (!result) return;
        if (answered < questions.length) {
          result.textContent = `${answered}/${questions.length} answered`;
          result.className = "quiz-score is-warn";
        } else {
          result.textContent = `${score}/${questions.length} correct`;
          result.className = `quiz-score ${score === questions.length ? "is-good" : "is-warn"}`;
        }
      });
    });
  };

  const initPaper = () => {
    if (!$("[data-paper-trade]")) return;
    readPaperState();
    renderMarketWatch();
    syncSelectedMarket();
    renderPaperPositions();
    const select = $("[data-paper-instrument]");
    select?.addEventListener("change", () => {
      selectedSymbol = select.value;
      syncSelectedMarket();
    });
    $("[data-paper-trade]")?.addEventListener("submit", event => {
      event.preventDefault();
      const side = $("[data-paper-side]")?.value || "long";
      const quantity = number($("[data-paper-quantity]")?.value);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        showPaperMessage("Enter a quantity greater than zero.", "error");
        return;
      }
      const item = market(select?.value || selectedSymbol);
      paperState.positions.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, symbol: item.symbol, side, quantity, entry: item.price });
      savePaperState();
      renderPaperPositions();
      showPaperMessage(`Paper ${side} opened for ${money(quantity, 4)} ${item.symbol} at ${price(item.price)}.`, "success");
    });
    $("[data-reset-paper]")?.addEventListener("click", () => {
      paperState = defaultPaper();
      localStorage.removeItem(paperKey);
      renderPaperPositions();
      showPaperMessage("Sample account reset. No real account was changed.", "success");
    });
  };

  const initMenu = () => {
    const toggle = $("[data-menu-toggle]");
    const menu = $("[data-menu]");
    if (!toggle || !menu) return;
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      menu.classList.toggle("is-open", !open);
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    initMenu();
    initCalculators();
    initQuiz();
    initPaper();
  });
})();
