var ezd6 = {};
ezd6.d6pips = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'].map((p,i)=>i?`<i class="fa-solid fa-dice-${p}" style="-webkit-text-stroke: 1px black;"></i>`:`<i class="fa-solid fa-square" style="-webkit-text-stroke: 1px black;"></i>`);
ezd6.herodice = `<i class="fa-solid fa-square" style="color:#aef601;background:unset;border:unset; -webkit-text-stroke: 1px black;"></i>`;
ezd6.karma = `<i class="fa-solid fa-circle" style="color:gold;background:unset;border:unset; -webkit-text-stroke: 1px black;"></i>`;
ezd6.strikes = '<i class="fa-solid fa-heart"  style="color:red;background:unset;border:unset; -webkit-text-stroke: 1px black;"></i>';
ezd6.value = ezd6.strikes;
ezd6.texts = {
  system: {  strikes: { value: "Strike" }, karma: "Karma", herodice: "Hero Die" },
  flags: { ezd6: {  strikes: { value: "Strike" }, karma: "Karma", herodice: "Hero Die" } },
};

Hooks.on('ready', ()=>{
  var link = document.querySelector("link[rel~='icon']");
  if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
  }
link.href = 'modules/ezd6-roll-messages/ezd6-logo.png';
  if (game.system.id == "ezd6") return;
  let ezd6 = {
      "strikes": {
          "value": 3,
          "max": 3
      },
      "tohit": 3,
      "description": "",
      "magicresist": 1,
      "armortype": "",
      "armorsave": 5,
      "miraculoussave": 5,
      "karma": 3,
      "herodice": 1,
      "wealth": "WEALTH.Moderate",
      "hasSpecies": false,
      "hasPath": false
  };
  let updates = game.actors.filter(a=>!a.flags.ezd6).map(a=>{return {_id:a.id, "flags.ezd6": ezd6 } })
  //console.log(updates)
  Actor.updateDocuments(updates)

  Hooks.on('preCreateActor', (actor, data)=>{actor.updateSource({flags: {ezd6}}) })
  Actor.prototype.getRollData = function (){
    return {...this.flags.ezd6, ...this.system}
  }
});

Hooks.on('setup', ()=>{
  if (game.system.id != "ezd6")
  ezd6.texts = {flags:{ezd6: {  strikes: { value: "Strike" }, karma: "Karma", herodice: "Hero Die"  }}};

  ezd6.system =  {
    karma:"system.karma",
    herodice: "system.herodice", 
    strikes: {
      value: "system.strikes.value", 
      max: "system.strikes.max"
    }, 
    armorsave:"system.armorsave", 
    miraculoussave: "system.miraculoussave", 
    tohit: "system.tohit"
  };
  if (game.system.id != "ezd6")
  ezd6.system = {
    karma:"flags.ezd6.karma", 
    herodice: "flags.ezd6.herodice", 
    strikes: {
      value: "flags.ezd6.strikes.value", 
      max: "flags.ezd6.strikes.max"
    }, 
    armorsave:"flags.ezd6.armorsave", 
    miraculoussave: "flags.ezd6.miraculoussave", 
    tohit: "flags.ezd6.tohit",
    magicresist: "flags.ezd6.magicresist",
    armortype: "flags.ezd6.armortype"
  };

  //if (game.system.id != "ezd6") return;
  document.documentElement.style.setProperty('--color-text-hyperlink',    '#A7F700'   );//'#A7F700'
  document.documentElement.style.setProperty('--color-shadow-primary',       '#A7F700');
  document.documentElement.style.setProperty('--color-shadow-highlight',     '#A7F700');
  document.documentElement.style.setProperty('--color-underline-active',     '#194419');
  document.documentElement.style.setProperty('--color-underline-header',     '#577F00');
  document.documentElement.style.setProperty('--color-border-highlight',     '#A7F700');
  document.documentElement.style.setProperty('--color-border-highlight-alt', '#A7F700');
  $('head').append($(`<style>::-webkit-scrollbar-thumb{background: var(--color-underline-header) !important;}</style>`));
  $('#logo').attr('src', 'modules/ezd6-roll-messages/ezd6-logo.png').removeAttr('height').css({height:'auto', width:'65px', margin: '10px 25px'});
});

Hooks.on('chatMessage', (chatlog, messageText, messageData)=>{
  if (messageText.trim().at(0)!="#") return;
  let parts = messageText.split('#');
  parts.shift();
  let flavor = parts.join('').trim();
  let message = game.messages.contents.reverse().filter(m=>m.user==game.user && m.flags.ezd6?.results)[0];
  message.update({flavor});
  return false;
})

Hooks.on('preUpdateActor', (actor, update, context)=>{
  for (let [key, value] of Object.entries(foundry.utils.flattenObject(update))) {
    if (Object.keys(foundry.utils.flattenObject(ezd6.texts)).includes(key)) {
      let dif = value - foundry.utils.getProperty(actor, key);
      foundry.utils.setProperty(context, key, dif);
      let up = foundry.utils.getProperty(foundry.utils.expandObject(context), key) > 0;
      ChatMessage.create({content:`${actor.name} ${(up ?'+':'')}${dif} ${foundry.utils.getProperty(ezd6.texts, key)} ${foundry.utils.getProperty(ezd6, key.split('.')[key.split('.').length-1])}`})
    } 
  }
});

Hooks.on('updateActor', (actor, update , context)=>{
  ui.players.render(true)
  for (let [key, value] of Object.entries(foundry.utils.flattenObject(update))) { 
    if (Object.keys(foundry.utils.flattenObject(ezd6.texts)).includes(key)) {
      let up = foundry.utils.getProperty(foundry.utils.expandObject(context), key) > 0;
      //if (!up) continue;
      let tokens = actor.getActiveTokens();
      let text = foundry.utils.getProperty(ezd6.texts, key);
      text = (up ?'+':'') + foundry.utils.getProperty(foundry.utils.expandObject(context), key) + " " + text ;
      for (let t of tokens)
        canvas.interface.createScrollingText(t.center, text, {
          anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
          direction: up ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
          distance: (2 * t.h),
          fontSize: 28,
          stroke: 0x000000,
          strokeThickness: 4,
          jitter: 0.25
        });
    } 
  }
});

Hooks.on('init', ()=>{
if (game.system.id == "ezd6")
Hooks.on('renderEZD6CharacterSheet', (app, html)=>{
  let actor = app.object;
  if (actor.type != 'character') return;
  let columns = [ 
  ["strikes.value",'<i class="fa-solid fa-heart"  style="color:red;" title="Strike"></i>', "Strikes"], 
  ["herodice", '<i class="fa-solid fa-square" style="color:#aef601;" title="Hero Die"></i>' , "Hero Die"],
  ["karma", '<i class="fa-solid fa-circle" style="color:gold;" title="Karma"></i>', "Karma"]
  ];
  let stats = 
  columns.reduce((acc, x, i)=>acc+=`<span>${Array(foundry.utils.getProperty(actor.system, x[0])+1).join(x[1]+"&nbsp;")}${i==0?Array(Math.max(actor.system.strikes.max-actor.system.strikes.value+1, 0)).join('<i class="fa-solid fa-heart" style="color: black;-webkit-text-stroke: 1px red;"></i>&nbsp;'):''}</span>`, `<span class="header-stats" style="margin-left:.5em;">`)+`<style>.ezd6.sheet.character.minimized{width:auto !important;}</style></span>`;
  app.element.find('.window-title > .header-stats').remove();
  app._element.find('.window-title').append(stats);
});
})

// adds a flag to the hook with results of d6 rolls
Hooks.on('preCreateChatMessage', async (message)=>{
  if (!message.rolls.length) return true;
  //if (!message.flavor) message.updateSource({flavor: " "})
  if (message.flavor.toUpperCase().includes('ATTACK') || message.flavor.toUpperCase().includes('SPELL') || message.flavor.toUpperCase().includes('MIRACLE'))
    if (game.user.targets.size) message.updateSource({flags:{ezd6:{targets: [...game.user.targets.map(t=>t.document.uuid)]}}});
  message.updateSource({flags:{ezd6:{results: message.rolls[0].dice.filter(d=>d.faces==6).reduce((a,x)=>{return [...a, ...x.results]}, [])}}});
});

Hooks.on('preUpdateChatMessage', (message, data)=>{
  if (!message.rolls?.length || !data.rolls?.length) return true;
  let roll = Roll.fromJSON(data.rolls[0]);
  //if (!message.flavor) foundry.utils.setProperty(data, "flavor", `Roll`);
  foundry.utils.setProperty(data, "flags.ezd6.results", roll.dice.filter(d=>d.faces==6).reduce((a,x)=>{return [...a, ...x.results]}, []));
});

// this does all the formatting for chat messages using Font-Awesome d6 glyphs
Hooks.on('renderChatMessage', (message, html)=>{
  //console.log('render chat message', message)
  if (message.flavor.includes("Draws") && message.flavor.includes("result")) return;
  if (!message.rolls?.length) return;
  if (message.whisper.length && !message.whisper.includes(game.user.id)) return;
  if (message.rolls[0].dice.filter(d=>d.faces==6).length!=message.rolls[0].dice.length) return; 
  //html.find('.message-sender').css({color: message.user.color, fontWeight: 'bold'})
  //let flavor =  message.flavor;//= html.find('.flavor-text').text().trim();
  //if (flavor) 
  //`<span class="flavor-text"><h3>3d6kl1 # <span class="flavor">Roll</span></h3></span>`
  if (!html.find('.flavor-text').length) html.find('.message-header').append(`<span class="flavor-text" ></span>`);
  
  html.find('.flavor-text').html(`<h3 draggable="true">${message.rolls[0].formula} # <span class="flavor">${message.flavor.capitalize()}</span></h3>`)
  html.find('h3[draggable=true]').on('dragstart', function(e){
    console.log(`[[/r ${$(this).text()}]]`)
     e.originalEvent.dataTransfer.setData("text/plain", `[[/r ${$(this).text()}]]`);
  })
  if (game.user.isGM)
  html.find('span.flavor').click(function(){
    if ($(this).prop('contenteditable')=='true') return;
    $(this).prop('role',"textbox")
    $(this).prop('contenteditable',"true")
    $(this).focus();
  }).focusout(async function(){
    $(this).find('span').remove();
    let flavor = $(this).html().trim();
    await message.update({flavor})
    $(this).prop('role',"")
    $(this).prop('contenteditable',"false")
  }).keydown(function(e){
    e.stopPropagation();
    if (e.key != "Enter") return;
    return $(this).blur();
  }).focusin(function(){
    $(this).select();
    let selection = window.getSelection();
    let range = document.createRange();
    range.selectNodeContents(this);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  })
  //message = {...message, ...{flags:{ezd6:{results: message.rolls[0].dice.filter(d=>d.faces==6).reduce((a,x)=>{return [...a, ...x.results]}, [])}}};
  if (!message.flags.ezd6?.results) return;
  //console.log(message.flags.ezd6.results);
  let results = [...message.flags.ezd6.results];
  let actions = [];
  let brutal = message.flavor.toUpperCase().includes('BRUTAL');
  if (message.flags.ezd6?.actions?.length)
    actions = [...message.flags.ezd6.actions];
  if (message.flavor.toUpperCase().includes('SPELL') || message.flavor.toUpperCase().includes('MIRACLE')) {
    if (results.map(r=>r.result).includes(1))
      for (let r of results) 
        if (r.result == 1) r.active = true;
        else r.active = false;
    else
      for (let r of results) 
        delete r.active;
  }
  let content = results.reduce((acc, r, i)=> {
    let color = 'white';
    if (r.hasOwnProperty('success') && !r.success) color ="grey";
    if (r.hasOwnProperty('discarded') && r.discarded) color ="grey";
    if (message.flavor.toUpperCase().includes('ATTACK') && r.result >= (brutal?5:6) && !r.discarded) color = "#aef601";
    if (r.hasOwnProperty('active') && !r.active) color = "grey";
    if ((message.flavor.toUpperCase().includes('SPELL') || message.flavor.toUpperCase().includes('MIRACLE')) && r.result == 1) color = "red";
    return acc += `<span data-index="${i}" data-roll="${r.result}" class="die" style="position: relative; font-size: 32px; color: ${color}; ">${(message.whisper.includes(game.user.id) || !message.whisper.length)?ezd6.d6pips[r.result]:ezd6.d6pips[0]}</span>&nbsp;`;
    }, ``)
  if (message.rolls[0].formula.toLowerCase().includes('cs'))
    if (results.filter(r=>r.success).length) content += '<h4 style="color:#0F0">SUCCEEDED</h4>';
    else content += '<h4 style="color:#F00">FAILED</h4>';
  content += actions.reduce((a,x)=>a+=`<p>${x}</p>`,``);
  if (game.system.id == "ezd6" && message.flags.ezd6?.targets?.length && (game.user.isGM || game.settings.get('ezd6-roll-messages', 'toHitForPlayers')))
    content = message.flags.ezd6?.targets.reduce((a,x)=>{
      let t = fromUuidSync(x);
      return a+=t?`<div style="display:grid; grid-template-columns: repeat(2, auto)">
        <span><img class="target" src="${t.texture.src}" width=45 style="padding: 3px;" data-id="${t.id}"></span>
        <div style="font-size: 8px"> To Hit:<br><span style="font-size: 30px">${ezd6.d6pips[t.actor.system.tohit]}</span></div>
      </div>`:``; 
    },`<div style="display: flex; flex-wrap: wrap">`) + `</div>`  + content;

  if (message.flavor.toUpperCase().includes('ATTACK') && message.isAuthor) {
    let resultsActive6 = message.flags.ezd6?.results?.filter(r=>r.result>=(brutal?5:6) && r.active);
    let resultsOriginalCrit = !!resultsActive6.filter(r=>!r.hasOwnProperty('count') && r.active).length;
    if (!!resultsActive6?.filter(r=>!r.hasOwnProperty('count') && r.active)?.length && resultsOriginalCrit) {
      let confirmRolls = message.flags.ezd6?.results?.filter(r=>r.hasOwnProperty('count'));
      if ((confirmRolls?.length && confirmRolls.at(-1)?.result>=(brutal?5:6)) || (!confirmRolls?.length && resultsOriginalCrit)) {
        content += `<button class="confirmCrit" ><span style="color: #aef601;">${ezd6.d6pips[brutal?5:6]}</span> Confirm Critical</button>`
      }
    }
  }

  
  html.find('div.message-content').html(content);

  html.find('button.confirmCrit').click(function(e){
    ezd6.confirmCrit(message, brutal);
    $(this).remove();
  })

  html.find('img.target').mouseover(function(e){
    let tok = canvas.tokens?.get($(this).data().id);
    let $div = $(`<div id="${tok.id}-marker" class="token-marker ${tok.id}" style="position: absolute; top: ${tok.y}px; left: ${tok.x}px; display:block;" data-tokenid="${tok.id}">
      <style>.token-marker {width: ${tok.w}px; height: ${tok.h}px; border: 3px solid red; border-radius: 8px;}</style></div>`);
      $('#hud').append($div);
  }).mouseout(function(e) {
    $('#hud').find('div.token-marker').remove();
  });
  
  return;
  if (!game.user.isGM) return;
  
  html.find('span.die').click(async function(e){
    e.stopPropagation();
    let results = [...message.flags.ezd6?.results];
    let actions = [];
    if (message.flags.ezd6?.actions) actions = message.flags.ezd6?.actions;
    let index = +$(this).data().index;
    let roll = +$(this).data().roll;
    if (e.ctrlKey) {
      actions.push(`${game.user.name} deleted die ${index+1} - ${ezd6.d6pips[results[index].result]}`);
      results.splice(index, 1);
      return message.update({flags:{ezd6:{results, actions}}});
    }
    if (e.ctrlKey) {
      actions.push(`${game.user.name} deleted die ${index+1} - ${ezd6.d6pips[results[index].result]}`);
      results.splice(index, 1);
      return message.update({flags:{ezd6:{results, actions}}});
    }
    if (e.shiftKey) {
        results[index].active = !results[index].active;
        results[index].discarded = !results[index].active;
        results[index].success = results[index].active;
        return message.update({flags:{ezd6:{results}}});
    }
    results[index].result = Math.clamped(roll + (e.originalEvent?-1:1), 0, 6);
    actions.push(`${game.user.name} ${e.originalEvent?"subtracted 1 from":"added 1 to"} die ${index+1} - ${ezd6.d6pips[results[index].result]}`);
    return message.update({flags:{ezd6:{results, actions}}});
    // experiement
    if (e.shiftKey) {
      
      results[index].result = Math.clamped(roll + (e.originalEvent?-1:1), 0, 6);
      actions.push(`${game.user.name} ${e.originalEvent?"subtracted 1 from":"added 1 to"} die ${index+1} - ${ezd6.d6pips[results[index].result]}`);
      return message.update({flags:{ezd6:{results}}});
    }
    /*
      let highest, lowest, modifier;
      for (let r of results.map(r=>r.result)) {
        if (highest == undefined) highest = r;
        if (lowest == undefined) lowest = r;
        if (r > highest) highest = r;
        if (lowest < undefined) lowest = r;
      }
      if (results.map(r=>r.result)[index])*/
    for (let r of results) {
      r.active = false;
      r.discarded = true
    }
    results[index].active = true
    results[index].discarded = false
      //results[index].success = results[index].active;
    return message.update({flags:{ezd6:{results, actions}}})
    //await ezd6.socket.executeAsGM("updateChatMessage", message.id, {flags:{ezd6:{results, actions}}});
  }).contextmenu(function(){$(this).click()})

})

Hooks.on('renderChatLog', (app, html)=>{
  html.find('#chat-controls').removeClass('flexrow')
  html.find('.control-buttons').css({display: 'inline'});
  html.find('.export-log').appendTo(html.find('.control-buttons'));
  html.find('.export-log, .chat-flush, .scroll-bottom').css({float:'right'});
  html.find('#chat-controls').find('.chat-control-icon').remove();
  //.find('i').removeClass('fa-dice-d20').addClass('fa-dice')

  html.find('#chat-controls').append($(`<a class="mode" title"Roll Mode" style="margin:.1em; float:right;"><i class="fas fa-eye"></i></a>`).click(async function(e){
    let buttons = Object.entries(CONST.DICE_ROLL_MODES).reduce((a,[key, value], i)=>{ a[key] = {label: key.toLowerCase().capitalize(), callback: ()=> { return game.settings.set("core", "rollMode", value);}}; return a},{})
    await Dialog.wait({title: 'Roll Mode', buttons, 
    render:(html)=>{
      $(html[2]).css({'flex-direction':'column'})
      let rollMode = Object.keys(CONST.DICE_ROLL_MODES).find(key => CONST.DICE_ROLL_MODES[key] === game.settings.get("core", "rollMode"));
      if (rollMode == 'roll') rollMode = 'publicroll';
      html.find(`button.${rollMode}`).css({'box-shadow':'inset 1px 1px 10px #0f0'})
    }, close:()=>{return ''}}, {width: 50, left:window.innerWidth, top: window.innerHeight});
  }));
  html.find('#chat-controls').prepend($(`<a class="flavor" title="Flavor" style="margin:.1em;"><i class="fas fa-hashtag"></i></a>`).click(async function(e){
    let flavors = ['Attack', 'Task', 'Armor Save', 'Cast Spell', 'Perform Miracle', 'Holy Light', 'Miraculous Save', 'Resistance'];
    if (game.user.character?.items.filter(i=>i.type="inclination" && i.name.toUpperCase().includes('DEVOUT')).length) flavors.splice(3, 0, 'Perform Miracle');
      if (game.user.isGM || game.user.character?.items.filter(i=>i.type="heropath" && i.name.toUpperCase().includes('FRIAR')).length) flavors.splice(1, 0, 'Holy Light');
      if (game.user.isGM || game.user.character?.items.filter(i=>i.type="heropath" && i.name.toUpperCase().includes('WARRIOR')).length) flavors.splice(1, 0, 'Brutal Attack');
      if (game.user.isGM || game.user.character?.items.filter(i=>i.type="heropath" && i.name.toUpperCase().includes('CONJURER')).length) flavors.splice(1, 0, 'Cast Spell');
    if (game.user.isGM) flavors.push('Aloofness');
    let buttons = flavors.reduce((a,f,i)=>{ a[f.slugify()] = { label: f, callback: ()=> { return f; }}; return a;}, {});
    let options = $(this).offset();
        //options.left -= 190;
        options.top -= 45;
        options.width = 80;
    let flavor = await Dialog.wait({title: 'Roll Flavor', buttons, render:(html)=>{$(html[2]).css({'flex-direction':'column'})}, close:()=>{return ''}}, options);
    if (!flavor) return;
    let textarea = html.find('#chat-message');
    let splitMessage = textarea.val().split(' # ')
    if (!splitMessage[0]) return textarea.val(' # ' + flavor);;
    let rollPart = splitMessage[0].split(' ');
    let roll = new Roll(rollPart[1]);
    roll.terms[0].modifiers.findSplice(i=>i.toUpperCase().includes('CS'))
    if (flavor.toUpperCase().includes('SAVE')) {
      if (flavor.toUpperCase().includes('MIRACULOUS')) roll.terms[0].modifiers.push('cs>=@miraculoussave')
      if (flavor.toUpperCase().includes('ARMOR')) roll.terms[0].modifiers.push('cs>=@armorsave');
    }
    rollPart.findSplice(i=>i.toUpperCase().includes('D6'), roll.formula)
    splitMessage.splice(0,1,rollPart.join(' '))
    if (splitMessage.length > 1) splitMessage.pop();
    splitMessage.push(flavor)
    textarea.val(splitMessage.join(' # '));
  }))
  html.find('#chat-controls').prepend($(`<a class="bane" title="Keep Lowest One" style="width:auto; margin:.1em; font-size: 20px;"><i class="fas fa-k"></i><i class="fas fa-l"></i><i class="fas fa-1"></i></a>`)
  .click(function(e){
    let splitMessage = html.find('#chat-message').val().split(' ');
    if (!splitMessage[1]) return;
    let roll = new Roll(splitMessage[1]);
    if (!roll) return;
    if (!roll.terms[0].modifiers.length) roll.terms[0].modifiers=['kl1'];
    else roll.terms[0].modifiers.findSplice(i=>i.toUpperCase().includes('K'), "kl1")
    if (!e.originalEvent) roll.terms[0].modifiers = [];
    splitMessage.splice(1,1,roll.formula);
    html.find('#chat-message').val(splitMessage.join(' '))
  }).contextmenu(function(e){$(this).click()}))
  html.find('#chat-controls').prepend($(`<a class="boon" title="Keep Highest One" style="width:auto; margin:.1em; font-size: 20px;"><i class="fas fa-k"></i><i class="fas fa-h"></i><i class="fas fa-1"></i></a>`)
  .click(function(e){
    let splitMessage = html.find('#chat-message').val().split(' ');
    if (!splitMessage[1]) return;
    let roll = new Roll(splitMessage[1]);
    if (!roll) return;
    if (!roll.terms[0].modifiers.length) roll.terms[0].modifiers=['kh1'];
    else roll.terms[0].modifiers.findSplice(i=>i.toUpperCase().includes('K'), "kh1")
    if (!e.originalEvent) roll.terms[0].modifiers = [];
    splitMessage.splice(1,1,roll.formula);
    html.find('#chat-message').val(splitMessage.join(' '));
  }).contextmenu(function(e){$(this).click()}))
  html.find('#chat-controls').prepend($(`<a class="sub" title="Subtract D6" style="margin:.1em;"><i class="fas fa-square-minus"></i></a>`).click(function(){
    let splitMessage = html.find('#chat-message').val().split(' ');
    if (!splitMessage[1]) return;
    let roll = new Roll(splitMessage[1]);
    if (!roll) return;
    if (roll.terms[0].number == 1) return;
    roll.terms[0].number--;
    splitMessage.splice(1,1,roll.formula);
    html.find('#chat-message').val(splitMessage.join(' '))
  }))
  html.find('#chat-controls').prepend($(`<a class="add" title="Add D6" style="margin:.1em;"><i class="fas fa-square-plus"></i></a>`).click(function(){
    let splitMessage = html.find('#chat-message').val().split(' ');
    if (splitMessage.length == 1) return $(this).prev().click();
    if (!splitMessage[1]) return;
    let roll = new Roll(splitMessage[1]);
    //if (!roll.terms[0].modifiers.length) roll.terms[0].modifiers=['kh1'];
    if (!roll) return;
    roll.terms[0].number++;
    splitMessage.splice(1,1,roll.formula);
    html.find('#chat-message').val(splitMessage.join(' '));
  }))
  html.find('#chat-controls').prepend($(`<a class="dice" title="Roll\nLeft Click: +d6\nRight Click: -d6" style="width:auto; margin:.2em"><i class="fas fa-dice"></i></a>`))
  //for (let i=6; i>0; i--) html.find('.control-buttons').prepend($(`<a class=><i class="fas fa-${i}"></i></a>`))
  html.find('#chat-form > a').remove();
  html.find('select.roll-type-select').hide();
  html.find('#chat-form').css({display:'grid', "grid-template-columns": "9fr 1fr"});
  let send = $(`<a style="border: 1px solid white;display: table;"><center style="height: 100%;display: table-cell; vertical-align: middle; "><i class="fas fa-paper-plane" style="vheight: 100%"></i></center></a>`);
  send.click(function(){
    app._sentMessages.unshift($(this).prev().val())
    ui.chat.processMessage($(this).prev().val());
    $(this).prev().val('');
  })
  html.find('#chat-form').append(send);
  html.find('.dice').click(async function(e){
    let rm = {BLIND:'br', PUBLIC:'r', PRIVATE:'gmr', SELF:'sr'};
    let rollMode = Object.keys(CONST.DICE_ROLL_MODES).find(key => CONST.DICE_ROLL_MODES[key] === game.settings.get("core", "rollMode"));
    if (html.find('#chat-message').val().includes('6')) return $(this).next().click();
    html.find('#chat-message').val(`/${rm[rollMode]} 1d6`)
  })
  .contextmenu(function(){if (html.find('#chat-message').val().includes('6')) return $(this).next().next().click();})
  .on('wheel', function(e){
    let text = html.find('#chat-message').val();
    let formula = text.split(' ').find(s=>s.includes('d6'))
    if (!formula) { 
      html.find('#chat-message').val(`/r 1d6`);
      formula = '1d6';
    }
    let terms = Roll.parse(formula)
    if (e.originalEvent.wheelDelta>0)  terms[0].modifiers = ['kh1'];
    else terms[0].modifiers = ['kl1'];
    if (terms[0].number == 0) return html.find('#chat-message').val(``);
    formula = Roll.fromTerms(terms).formula
    html.find('#chat-message').val(`/r ${formula}`);
  })
  html.find(`#chat-controls > a, .control-buttons > a`).css('margin', '.18em')
})

Hooks.on('getChatLogEntryContext', (html, options)=>{
  
  options.unshift({
    name: "Use Karma",
    icon: ezd6.karma,
    condition: li => {
      const message = game.messages.get(li.data("messageId"));
      if (!message.rolls?.length) return false;
      if (message.flavor.toUpperCase().includes('SPELL')) return false;
      if (message.flavor.toUpperCase().includes('MIRACLE')) return false;
      if (message.rolls[0].total == 1) return false;
      return message.user.id == game.user.id && foundry.utils.getProperty(game.user.character, ezd6.system.karma) > 0;
    },
    callback: li => {
      const message = game.messages.get(li.data("messageId"));
      return ezd6.useKarma(message);
    }
  });
  options.unshift({
    name: "Use Hero Die",
    icon: ezd6.herodice,
    condition: li => {
      const message = game.messages.get(li.data("messageId"));
      if (!message.rolls?.length) return false;
      return message.user.id == game.user.id && foundry.utils.getProperty(game.user.character, ezd6.system.herodice) > 0 ;
    },
    callback: li => {
      const message = game.messages.get(li.data("messageId"));
      return ezd6.useHeroDie(message)
    }
  });
  options.unshift({
    name: "Change Flavor",
    icon: '<i class="fa-solid fa-hashtag"></i>',
    condition: li => {
      const message = game.messages.get(li.data("messageId"));
      if (!message.rolls?.length) return false;
      return message.user.id == game.user.id || game.user.isGM;
    },
    callback: li => {
      let offset = $(li).offset()
      const message = game.messages.get(li.data("messageId"));
      new Dialog({
        title:'Flavor',
        content:'<input type="text" style="text-align:center" autofocus></input>',
        render:(html)=>{ html.find('input').val(message.flavor).select(); },
        buttons: {confirm: {icon:'<i class="fa-solid fa-check"></i>', callback: (html)=>{ message.update({flavor: html.find('input').val()})}} },
        default: 'confirm'
      },{width:200, top: offset.top, left: offset.left-200}).render(true)
      return;
    }
  });
  if (!game.user.isGM) return;
  
  options.unshift({
    name: "Keep Lowest",
    icon: '<i class="fa-solid fa-down-long"></i>',
    condition: li => {
      const message = game.messages.get(li.data("messageId"));
      if (!message.rolls?.length) return false;
      return true;
    },
    callback: async li => {
      let message = game.messages.get(li.data("messageId"));
      //console.log(message);
      let roll = message.rolls[0];
      let terms = roll.terms;
      let modifier = 'kl1'
      let newRoll = new Roll();
      newRoll.terms.push(roll.terms[0]);
      newRoll.terms[0].modifiers=[modifier];
      newRoll._evaluated=false;
      let highest, lowest;
      for (let i = 0; i<newRoll.terms.length; i++)
        if (newRoll.terms[i] instanceof DiceTerm && newRoll.terms[i].faces == 6 && terms[i].results.length>1) {
          for (let r = 0; r<terms[i].results.length; r++) {
            if (!highest || highest.result < terms[i].results[r].result) highest = {index:r, result:terms[i].results[r].result};
            if (!lowest || lowest.result > terms[i].results[r].result) lowest = {index:r, result:terms[i].results[r].result};
          }
        }
      for (let i = 0; i<newRoll.terms.length; i++) {
        if (newRoll.terms[i] instanceof DiceTerm && newRoll.terms[i].faces == 6 && terms[i].results.length>1) {
          
          for (let d = 0; d<newRoll.terms[i].results.length; d++) 
            if (d !== lowest.index) {
               terms[i].results[d].active = false;
               terms[i].results[d].discarded = true;
            } else {
              terms[i].results[d].active = true;
              terms[i].results[d].discarded = false;
            }
        }
      }
      newRoll._formula = Roll.fromTerms(newRoll.terms).formula;
      await newRoll.evaluate();
      await message.update({rolls: [JSON.stringify(newRoll)]})
    }
  });
  options.unshift({
    name: "Keep Highest",
    icon: '<i class="fa-solid fa-up-long"></i>',
    condition: li => {
      const message = game.messages.get(li.data("messageId"));
      if (!message.rolls?.length) return false;
      return true;
    },
    callback: async li => {
      let message = game.messages.get(li.data("messageId"));
      //console.log(message);
      let roll = message.rolls[0];
      let terms = roll.terms;
      let modifier = 'kh1'
      let newRoll = new Roll();
      newRoll.terms.push(roll.terms[0]);
      newRoll.terms[0].modifiers=[modifier];
      newRoll._evaluated=false;
      let highest, lowest;
      for (let i = 0; i<newRoll.terms.length; i++)
        if (newRoll.terms[i] instanceof DiceTerm && newRoll.terms[i].faces == 6 && terms[i].results.length>1) {
          for (let r = 0; r<terms[i].results.length; r++) {
            if (!highest || highest.result < terms[i].results[r].result) highest = {index:r, result:terms[i].results[r].result};
            if (!lowest || lowest.result > terms[i].results[r].result) lowest = {index:r, result:terms[i].results[r].result};
          }
        }
      for (let i = 0; i<newRoll.terms.length; i++) {
        if (newRoll.terms[i] instanceof DiceTerm && newRoll.terms[i].faces == 6 && terms[i].results.length>1) {
          for (let d = 0; d<newRoll.terms[i].results.length; d++) 
            if (d !== highest.index) {
              terms[i].results[d].active = false;
              terms[i].results[d].discarded = true;
            } else {
              terms[i].results[d].active = true;
              terms[i].results[d].discarded = false;
            }
        }
      }
      newRoll._formula = Roll.fromTerms(newRoll.terms).formula;
      await newRoll.evaluate();
      await message.update({rolls: [JSON.stringify(newRoll)]})
    }
  });
});


ezd6.confirmCrit = async function(message, brutal) {
  //let message = game.messages.contents.filter(m=>m.user==game.user&&m.flags.ezd6?.results?.length).reverse()[0];
  if (!message) 
    return ui.notifications.warn('No message.');
  let resultsActive6 = message.flags.ezd6?.results?.filter(r=>r.result>=brutal?5:6 && r.active);
  let resultsOriginalCrit = !!resultsActive6.filter(r=>!r.hasOwnProperty('count') && r.active).length;
  let confirmRolls = message.flags.ezd6?.results?.filter(r=>r.hasOwnProperty('count'));
  if (!message.flavor.toUpperCase().includes('ATTACK'))
    return ui.notifications.warn('Your last roll was not an attack.');
  if (!resultsActive6.length)
    return ui.notifications.warn(`You did not roll a ${brutal?'5+':'6'} on your attack.`);
  if (!resultsOriginalCrit)
    return ui.notifications.warn(`Your attack roll was not a ${brutal?'5+':'6'}.`);
  if (confirmRolls.length)
    if (!confirmRolls.at(-1)?.result>=(brutal?5:6))
      return ui.notifications.warn(`Your last roll was not a ${brutal?'5+':'6'}.`);
  let roll = await new Roll(`1d6cs>=${brutal?5:6}`).roll();
  if (game.modules.get('dice-so-nice')?.active)
    await game.dice3d.showForRoll(roll, game.user, true);
  let results = [...message.flags.ezd6.results, ...roll.dice.reduce((a,x)=>{return [...a, ...x.results]}, [])];
  let actions = [];
  if (message.flags.ezd6.actions?.length)
    actions = [...message.flags.ezd6.actions];
  actions.push(`Rolled die ${results.length} to confirm a crit - ${ezd6.d6pips[results[results.length-1].result]}`)
  await message.update({content:roll.total, flags:{ezd6:{results, actions}}});
  //console.log(roll)
  //if (roll.total==1) ezd6.confirmCrit(message, brutal);
}


ezd6.useKarma = async function(message) {
  //let message = game.messages.contents.reverse().filter(m=>m.user==game.user && m.flags.ezd6?.results)[0];
  let character = game.user.character;
  let karma = foundry.utils.getProperty(character, ezd6.system.karma);
  if (!character) return ui.notifications.warn("No Character Assigned");
  if (foundry.utils.getProperty(character, ezd6.system.karma) == 0 ) return ui.notifications.warn("You do not have Karma to use.");
  let actions = [];
  if (message.flags.ezd6?.actions) actions = message.flags.ezd6?.actions;
  if (message.flavor.toUpperCase().includes('SPELL') || message.flavor.toUpperCase().includes('MIRACLE')) return ui.notifications.notify('You cannot use Karma on magick or miracle rolls.')
  let results = [...message.flags.ezd6?.results];
  let index = results.findLastIndex(r=>r.active)
  let result = results[index];
  let roll = result.result;
  if (roll == 1) return ui.notifications.warn("Cannot use Karma on a roll of 1.");
  if (roll == 6) return ui.notifications.warn("You do not need to use Karma. You rolled of 6.");
  results[index].result = roll + 1;
  let save = Number(message.rolls[0].formula.split('>=')[1]);
  if (results[index].hasOwnProperty('success') && (results[index].result == 6 || results[index].result >= save)) results[index].success = true;
  if (results[index].hasOwnProperty('success') && results[index].result < save) results[index].success = false;
  actions.push(`${character?.name || game.user.name} used a Karma on die ${index+1} - ${ezd6.karma}`);
  
  await game.user.character.update({[`${ezd6.system.karma}`]:karma-1});
  return await message.update({flags:{ezd6:{results, actions}}});
  //await ezd6.socket.executeAsGM("updateChatMessage", message.id, {flags:{ezd6:{results, actions}}});
}

ezd6.useHeroDie = async function(message) {
  //let message = game.messages.contents.reverse().filter(m=>m.user==game.user && m.flags.ezd6?.results)[0];
  let character = game.user.character;
  let herodice = foundry.utils.getProperty(character, ezd6.system.herodice);
  if (!character) return ui.notifications.warn("No Character Assigned");
  if (herodice == 0 ) return ui.notifications.warn("You do not have a Hero Die to use.");
  let actions = [];
  if (message.flags.ezd6?.actions) actions = message.flags.ezd6?.actions;
  let results = [...message.flags.ezd6?.results];
  let index = results.findLastIndex(r=>r.active)
  if ((message.flavor.toUpperCase().includes('SPELL') || message.flavor.toUpperCase().includes('MIRACLE')) && results.find(r=>r.result == 1)) index = results.findIndex(r=>r.result == 1)
  let result = results[index];
  let roll = result.result;
  if (roll == 6) return ui.notifications.warn("You do not need to use a Hero Die. You rolled of 6.");
  let hd = await new Roll('1d6[hero]').roll();
  if (game.modules.get('dice-so-nice')?.active) await game.dice3d.showForRoll(hd, game.user, true);
  results[index].result = hd.total;
  let save = Number(message.rolls[0].formula.split('>=')[1]);
  if (results[index].hasOwnProperty('success') && (results[index].result == 6 || results[index].result >= save)) results[index].success = true;
  if (results[index].hasOwnProperty('success') && results[index].result <  save) results[index].success = false;
  actions.push(`${game.user.character?.name || game.user.name} used a Hero Die on die ${index+1} - ${ezd6.herodice}</i>`);
  await game.user.character.update({[`${ezd6.system.herodice}`]:herodice-1});
  return await message.update({flags:{ezd6:{results, actions}}});
  //await ezd6.socket.executeAsGM("updateChatMessage", message.id, {flags:{ezd6:{results, actions}}});
}

Hooks.once("setup", async () => {
  let fonts = game.settings.get('core', 'fonts')
  fonts["d6"] = {
    "editor": true,
    "fonts": [
      {
        "urls": [
          "modules/ezd6-roll-messages/d6-Regular.otf"
        ],
        "weight": 400,
        "style": "normal"
      }
    ]
  }
  game.settings.set('core', 'fonts', fonts)
  
  game.settings.register('ezd6-roll-messages', 'toHitForPlayers', {
    name: `To Hit For Players`,
    hint: `Determines whether to display monster to hit value in chat card for Players`,
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: value => { 
      for (let m of game.messages) ui.chat.updateMessage(m);
    }
  });
});

Hooks.on('diceSoNiceReady', (dice3d) => {

  
  dice3d.addSystem({id:"ezd6",name:"⁂ EZD6 (d6, special)"},false);

  dice3d.addDicePreset({
    type:"d6",
    labels:[
      'modules/ezd6-roll-messages/faces/d6-1-ezd6.webp',
      'modules/ezd6-roll-messages/faces/d6-2-ezd6.webp',
      'modules/ezd6-roll-messages/faces/d6-3-ezd6.webp',
      'modules/ezd6-roll-messages/faces/d6-4-ezd6.webp',
      'modules/ezd6-roll-messages/faces/d6-5-ezd6.webp',
      'modules/ezd6-roll-messages/faces/d6-6-ezd6.webp'
    ],
	system:"ezd6"
  });

  game.dice3d.addColorset({
  name: "hero",
            foreground: "#000000",
            background: "#aef601",
            outline: "#3a00ae",
            edge: "#3a00ae",
            texture: "none",
            material: "metal",
            font: "d6",
            visibility: "visible",
        });

});

Hooks.on('renderPlayerList', (app, html) => {
  html.prepend(`<style>#player-list i {padding: .05em;}</style>`)
  html.css({width: 'max-content', 'padding-right': '.2em'})
  html.find('ol#player-list').css({
    'display': 'grid',
    'grid-template-columns': 'repeat(5, max-content)',
    'column-gap': '.2em'
  });
  //html.css({width: '400px'})
 let columns = [ 
  [ezd6.system.strikes.value ,   ezd6.strikes   ,  "Strikes"], 
  [ezd6.system.herodice ,   ezd6.herodice     , "Hero Dice"],
  [ezd6.system.karma,   ezd6.karma, "Karma"]
  ];
  for (let user of game.users.filter(u=>u.character)) {
    let $li = html.find(`li[data-user-id="${user.id}"]`);
     $li.after(`<a style="margin-right:.25em; padding-top:.15em;" class="char-name" data-id="${user.character.id}" data-user="${user.id}">${user.character.name}</a>` + 
               columns.reduce((acc, x, i)=>acc+=`<a style="padding:.1em;" class="ezd6-ui-link" title="${x[2]}" data-column="${i}" data-key="${x[0]}" data-user="${user.id}">${Array(foundry.utils.getProperty(user.character, x[0])+1).join(x[1])}</a>`, ``));
     $li.find(".player-name").html(user.name+'&ensp;');
  }
  for (let user of game.users.filter(u=>!u.character)) {
    let $li = html.find(`li[data-user-id="${user.id}"]`);
     $li.after(`<span style="margin-right:.25em; padding-top:.15em;"></span><span></span><span></span><span></span>` );
     $li.find(".player-name").html(user.name+'&ensp;');
  }
   html.find('a.char-name').click(function(){
     let character = game.actors.get(this.dataset.id);
     character.sheet.render(true);
     
   }).contextmenu(function(){
     let character = game.actors.get(this.dataset.id);
     if (game.modules.get('ffs')?.active && game.settings.get('ffs', 'defaultSheet')) return character.freeformSheet(game.settings.get('ffs', 'defaultSheet'));
   });
  if (!game.user.isGM) return;
  html.find(`a.ezd6-ui-link`).click(async function(e){
    console.log(e, this.dataset.user)
    let user = game.users.get(this.dataset.user);
    let character = user.character;
    if (foundry.utils.getProperty(user.character, this.dataset.key)-1<0 && !!e.originalEvent) return ui.notifications.warn(`Value cannot be negative.`);
    await character.update({[this.dataset.key]: (e.shiftKey||!!e.originalEvent)?+foundry.utils.getProperty(character, this.dataset.key)-1:+foundry.utils.getProperty(character, this.dataset.key)+1});
  }).contextmenu(async function(e){ $(this).click(); })
    
  let updateCharacterDebounce = foundry.utils.debounce((character,key,value)=> { character.update({[key]: value}); }, 500);
    
  html.find(`a.ezd6-ui-link`).on('wheel', async function(e){
    let user = game.users.get(this.dataset.user);
    let character = user.character;
    let change = (e.originalEvent.wheelDelta<0)?-1:1;
    let value = [...$(this).find('i')].length;
    value+=change;
    if (value<0) return;
    if (+this.dataset.column == 0 && value > foundry.utils.getProperty(character, ezd6.system.strikes.max)) return;
    if (e.originalEvent.wheelDelta>0) $(this).append($(columns[this.dataset.column][1]))
    else $(this).find('i').first().remove();
    updateCharacterDebounce(character, this.dataset.key, value);
  });
});