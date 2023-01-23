var ezd6 = {};
ezd6.d6pips = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'].map((p,i)=>i?`<i class="fa-solid fa-dice-${p}" style=" -webkit-text-stroke: 1px black;"></i>`:`<i class="fa-solid fa-square" style=" -webkit-text-stroke: 1px black;"></i>`);
ezd6.herodice = `<i class="fa-solid fa-square" style="color:limegreen;background:unset;border:unset; -webkit-text-stroke: 1px black;"></i>`;
ezd6.karma = `<i class="fa-solid fa-circle" style="color:gold;background:unset;border:unset; -webkit-text-stroke: 1px black;"></i>`;
ezd6.strikes = '<i class="fa-solid fa-heart"  style="color:red;background:unset;border:unset; -webkit-text-stroke: 1px black;"></i>';
/*
ezd6.updateChatMessage = async function(id, update) {
  return await game.messages.get(id).update(update);
}

Hooks.once("socketlib.ready", () => {
	ezd6.socket = socketlib.registerModule("ezd6-roll-messages");
	ezd6.socket.register("updateChatMessage", ezd6.updateChatMessage);
});
*/
Hooks.on('renderEZD6CharacterSheet', (app, html)=>{
  let actor = app.object;
  if (actor.type != 'character') return;
  let columns = [ 
  ["strikes.value",'<i class="fa-solid fa-heart"  style="color:red;" title="Strike"></i>', "Strikes"], 
  ["herodice", '<i class="fa-solid fa-square" style="color:limegreen;" title="Hero Die"></i>' , "Hero Die"],
  ["karma", '<i class="fa-solid fa-circle" style="color:gold;" title="Karma"></i>', "Karma"]
  ];
  let stats = 
  columns.reduce((acc, x, i)=>acc+=`<span>${Array(foundry.utils.getProperty(actor.system, x[0])+1).join(x[1]+"&nbsp;")}${i==0?Array(Math.max(actor.system.strikes.max-actor.system.strikes.value+1, 0)).join('<i class="fa-solid fa-heart" style="color: black;-webkit-text-stroke: 1px red;"></i>&nbsp;'):''}</span>`, `<span class="header-stats" style="margin-left:.5em;">`)+`<style>.ezd6.sheet.character.minimized{width:auto !important;}</style></span>`;
  app.element.find('.window-title > .header-stats').remove();
  app._element.find('.window-title').append(stats);
});

// adds a flag to the hook with results of d6 rolls
Hooks.on('preCreateChatMessage', async (message)=>{
  if (!message.rolls.length) return true;
  if (message.flavor.toUpperCase().includes('ATTACK') || message.flavor.toUpperCase().includes('CAST'))
    if (game.user.targets.size) message.data.update({flags:{ezd6:{targets: [...game.user.targets.map(t=>t.document.uuid)]}}});
  message.data.update({flags:{ezd6:{results: message.rolls[0].dice.filter(d=>d.faces==6).reduce((a,x)=>{return [...a, ...x.results]}, [])}}});
});

// this does all the formatting for chat messages using Font-Awesome d6 glyphs
Hooks.on('renderChatMessage', (message, html)=>{
  if (message.flavor.includes("Draws a result")) return;
  if (!message.rolls?.length) return;
  if (message.rolls[0].dice.filter(d=>d.faces==6).length!=message.rolls[0].dice.length) return; 
  html.find('.message-sender').css({color: message.user.color, fontWeight: 'bold'})
  let flavor = html.find('.flavor-text').text().trim();
  if (flavor) html.find('.flavor-text').html(`<h3 draggable="true">${message.rolls[0].formula} # ${flavor.capitalize()}</h3>`)

  if (!message.flags.ezd6?.results) return;
  //console.log(message.flags.ezd6.results);
  let results = [...message.flags.ezd6.results];
  let actions = [];
  let brutal = message.flavor.toUpperCase().includes('BRUTAL');
  if (message.flags.ezd6?.actions?.length)
    actions = [...message.flags.ezd6.actions];
  if (message.flavor.toUpperCase().includes('CAST')) {
    if (results.map(r=>r.result).includes(1))
      for (let r of results) 
        if (r.result == 1) r.active = true;
        else r.active = false;
    else
      for (let r of results) 
        delete r.active;
  }
  let content = results.reduce((acc, r, i)=> {
    let color = 'inherit';
    if (r.hasOwnProperty('success') && !r.success) color ="grey";
    if (r.hasOwnProperty('discarded') && r.discarded) color ="grey";
    if (message.flavor.toUpperCase().includes('ATTACK') && r.result >= (brutal?5:6) && !r.discarded) color = "limegreen";
    if (r.hasOwnProperty('active') && !r.active) color = "grey";
    if (message.flavor.toUpperCase().includes('CAST') && r.result == 1) color = "red";
    return acc += `<span data-index="${i}" data-roll="${r.result}" class="die" style="position: relative; font-size: 32px; color: ${color};">${(message.whisper.includes(game.user.id) || !message.whisper.length)?ezd6.d6pips[r.result]:ezd6.d6pips[0]}</span>&nbsp;`;
    }, ``) + 
    actions.reduce((a,x)=>a+=`<p>${x}</p>`,``);
  if (message.flags.ezd6?.targets?.length && (game.user.isGM || game.settings.get('ezd6-roll-messages', 'toHitForPlayers')))
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
        content += `<button class="confirmCrit">${ezd6.d6pips[brutal?5:6]} Confirm Critical</button>`
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

  if (game.user.isGM)
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
    if (e.shiftKey) {
        results[index].active = !results[index].active;
        results[index].discarded = !results[index].active;
        results[index].success = results[index].active;
        return message.update({flags:{ezd6:{results}}});
    }
    results[index].result = Math.clamped(roll + (e.originalEvent?-1:1), 0, 6);
    actions.push(`${game.user.name} ${e.originalEvent?"subtracted 1 from":"added 1 to"} die ${index+1} - ${ezd6.d6pips[results[index].result]}`);
    return message.update({flags:{ezd6:{results, actions}}})
    //await ezd6.socket.executeAsGM("updateChatMessage", message.id, {flags:{ezd6:{results, actions}}});
  }).contextmenu(function(){$(this).click()})

  /*
  if (!message.flavor.includes('Cast'))
    html.find('span.die').append(`<a class="karma" style="position:absolute;left:0px;" hidden="true">${ezd6.karma}</a>`)
  html.find('span.die').append(`<a class="herodice" style="position:absolute;right:0px;" hidden="true">${ezd6.herodice}</a>`)
  html.find('span.die *').css({background: 'unset'})
  html.find('span.die > a').css({fontSize: '12px', bottom: '-5px'})
  
  if (game.user==message.user || 
  game.user.character.items.filter(i=>i.name=='Inspiring').length ||
  (message.user.isGM && game.users.contents.flatMap(u=>u.character?.items.getName('Skald')).filter(i=>!!i).length))
  html.find('span.die')
  .mouseover(function(e){
    if ($(this).find('i').hasClass('fa-dice-six') ) return;
    //if ($(this)[0].style.color == 'grey') return;
    if (!!game.user.character?.system?.karma && !$(this).find('i').hasClass('fa-dice-one')) $(this).find('a.karma').show()
    if (!!game.user.character?.system?.herodice) $(this).find('a.herodice').show()
  })
  .mouseout(function(e) {
      html.find('a.karma, a.herodice').hide()
  })
  
  
  html.find('a.karma').click(async function(e){
    e.stopPropagation();
    if (game.user.character.system.karma == 0) return ui.notifications.warn("You have no Karma left.");
    if (e.shiftKey) return;
    if (message.flavor.toUpperCase().includes('SPELL')) return ui.notifications.warn(`You cannot use Karma on spell cast rolls.`);
    let results = [...message.flags.ezd6?.results];
    let actions = [];
    if (message.flags.ezd6?.actions) actions = message.flags.ezd6?.actions;
    let index = +$(this).parent().data().index;
    let roll = +$(this).parent().data().roll;
    if (results[index].discarded) return ui.notifications.warn(`You cannot use Karma on discarded rolls. Why would you?`);
    if (roll == 6) return ui.notifications.warn("Cannot use Karma on a roll of 6. Why would you?");
    results[index].result = roll + ((!game.user.isGM && message.user.isGM)?-1:1);
    if (results[index].hasOwnProperty('success') && results[index].result >= save) results[index].success = true;
    if (results[index].hasOwnProperty('success') && results[index].result <  save) results[index].success = false;
    actions.push(`${game.user.character?.name || game.user.name} used a Karma on die ${index+1} - ${ezd6.karma}`);
    //await message.update({flags:{ezd6:{results, actions}}});
    await ezd6.socket.executeAsGM("updateChatMessage", message.id, {flags:{ezd6:{results, actions}}});
    await game.user.character.update({system:{karma:game.user.character.system.karma-1}});
  });

  html.find('a.herodice').click(async function(e){
    e.stopPropagation();
    if (game.user.flags.ezd6.hd == 0) return ui.notifications.warn("You have no Hero Dice left.");
    let results = [...message.flags.ezd6?.results];
    let actions = [];
    let save = Number(message.rolls[0].formula.split('>=')[1])
    if (message.flags.ezd6?.actions) actions = message.flags.ezd6?.actions;
    let index = +$(this).parent().data().index;
    let roll = +$(this).parent().data().roll;
    if (roll == 6) return ui.notifications.warn("Why would you try to use a Hero Die to reroll a 6?");
    if (results[index].discarded && !message.flavor.includes('Cast')) return ui.notifications.warn(`You cannot use a Hero Die on a discarded roll. Why would you?`);
    let hd = await new Roll('1d6').roll();
    if (game.modules.get('dice-so-nice')?.active) await game.dice3d.showForRoll(hd, game.user, true);
    results[index].result = hd.total;
    actions.push(`${game.user.character?.name || game.user.name} used a Hero Die on die ${index+1} - ${ezd6.herodice}</i>`);
    if (results[index].hasOwnProperty('success') && results[index].result >= save) results[index].success = true;
    if (results[index].hasOwnProperty('success') && results[index].result <  save) results[index].success = false;
    //await message.update({flags:{ezd6:{results, actions}}})
    await ezd6.socket.executeAsGM("updateChatMessage", message.id, {flags:{ezd6:{results, actions}}});
    await game.user.character.update({system:{herodice:game.user.character.system.herodice-1}});
  });

  */
})

Hooks.on('renderChatLog', (app, html)=>{
  html.find('#chat-controls').removeClass('flexrow')
  html.find('.control-buttons').css({display: 'inline'});
  html.find('.export-log').appendTo(html.find('.control-buttons'));
  html.find('.export-log, .chat-flush, .scroll-bottom').css({float:'right'});
  html.find('#chat-controls').find('.chat-control-icon').remove();
  //.find('i').removeClass('fa-dice-d20').addClass('fa-dice')

  html.find('#chat-controls').append($(`<a class="flavor" style="margin:.1em; float:right;"><i class="fas fa-eye"></i></a>`).click(async function(e){
    
    let buttons = {};
    for (let [key, value] of Object.entries(CONST.DICE_ROLL_MODES)) 
      buttons[key] = {label: key.toLowerCase().capitalize(), callback: ()=> { return game.settings.set("core", "rollMode", value);}};
    await Dialog.wait({title: 'Roll Mode', buttons, 
    render:(html)=>{
      $(html[2]).css({'flex-direction':'column'})
      let rollMode = Object.keys(CONST.DICE_ROLL_MODES).find(key => CONST.DICE_ROLL_MODES[key] === game.settings.get("core", "rollMode"));
      if (rollMode == 'roll') rollMode = 'publicroll';
      html.find(`button.${rollMode}`).css({'box-shadow':'inset 1px 1px 10px #f00'})
    }, close:()=>{return ''}}, {width: 50, left:window.innerWidth, top: window.innerHeight});
  }));
  html.find('#chat-controls').prepend($(`<a class="flavor" style="margin:.1em;"><i class="fas fa-hashtag"></i></a>`).click(async function(e){
    let flavors = ['Attack', 'Cast', 'Task', 'Armor Save', 'Miraculous Save', 'Resistance'];
    if (game.user.isGM || game.user.character?.items.filter(i=>i.type="heropath" && i.name.toUpperCase().includes('WARRIOR')).length) flavors.splice(1, 0, 'Brutal Attack');
    if (game.user.isGM) flavors.push('Aloofness');
    let buttons = {};
    let options = flavors.map(f=>{return{ label: f, callback: ()=> { return f; }}})
    for (let o of options) buttons[o.label.slugify()] = o;
    let flavor = await Dialog.wait({title: 'Roll Flavor', buttons, render:(html)=>{$(html[2]).css({'flex-direction':'column'})}, close:()=>{return ''}},{width: 80, left:window.innerWidth, top: window.innerHeight})
    let textarea = html.find('#chat-message');
    let splitMessage = textarea.val().split(' # ')
    if (flavor.toUpperCase().includes('SAVE')) {
      if (flavor.toUpperCase().includes('MIRACULOUS')) splitMessage[1]+='cs>=@miraculoussave'
      if (flavor.toUpperCase().includes('ARMOR')) splitMessage[1]+='cs>=@armorsave';
    }
    if (splitMessage.length > 1) splitMessage.pop();
    splitMessage.push(flavor)
    textarea.val(splitMessage.join(' # '));
  }))
  html.find('#chat-controls').prepend($(`<a class="bane" style="width:auto; margin:.1em; font-size: 20px;"><i class="fas fa-k"></i><i class="fas fa-l"></i><i class="fas fa-1"></i></a>`).click(function(){
    let splitMessage = html.find('#chat-message').val().split(' ');
    if (!splitMessage[1]) return;
    let roll = new Roll(splitMessage[1]);
    if (!roll) return;
    roll.terms[0].modifiers=['kl1'];
    splitMessage.splice(1,1,roll.formula);
    html.find('#chat-message').val(splitMessage.join(' '))
  }))
  html.find('#chat-controls').prepend($(`<a class="boon" style="width:auto; margin:.1em; font-size: 20px;"><i class="fas fa-k"></i><i class="fas fa-h"></i><i class="fas fa-1"></i></a>`).click(function(){
    let splitMessage = html.find('#chat-message').val().split(' ');
    if (!splitMessage[1]) return;
    let roll = new Roll(splitMessage[1]);
    if (!roll) return;
    roll.terms[0].modifiers=['kh1'];
    splitMessage.splice(1,1,roll.formula);
    html.find('#chat-message').val(splitMessage.join(' '));
  }))
  html.find('#chat-controls').prepend($(`<a class="sub" style="margin:.1em;"><i class="fas fa-square-minus"></i></a>`).click(function(){
    let splitMessage = html.find('#chat-message').val().split(' ');
    if (!splitMessage[1]) return;
    let roll = new Roll(splitMessage[1]);
    if (!roll) return;
    if (roll.terms[0].number == 1) return;
    roll.terms[0].number--;
    splitMessage.splice(1,1,roll.formula);
    html.find('#chat-message').val(splitMessage.join(' '))
  }))
  html.find('#chat-controls').prepend($(`<a class="add" style="margin:.1em;"><i class="fas fa-square-plus"></i></a>`).click(function(){
    let splitMessage = html.find('#chat-message').val().split(' ');
    if (splitMessage.length == 1) return $(this).prev().click();
    if (!splitMessage[1]) return;
    let roll = new Roll(splitMessage[1]);
    if (!roll.terms[0].modifiers.length) roll.terms[0].modifiers=['kh1'];
    if (!roll) return;
    roll.terms[0].number++;
    splitMessage.splice(1,1,roll.formula);
    html.find('#chat-message').val(splitMessage.join(' '));
  }))
  html.find('#chat-controls').prepend($(`<a class="dice" style="width:auto; margin:.2em"><i class="fas fa-dice"></i></a>`))
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
    html.find('#chat-message').val(`/${rm[rollMode]} 1d6`)
    /*
    if (e.shiftKey) {
      let message = game.messages.filter(m=>m.flags.ezd6?.results && m.user == game.user).reverse()[0];
      if (!message) return ui.notifications.warn('No roll message found to add to.');
      let roll = await new Roll('1d6').roll();
      if (game.modules.get('dice-so-nice')?.active)
        await game.dice3d.showForRoll(roll, game.user, true);
      let results = [...message.flags.ezd6.results, ...roll.dice.reduce((a,x)=>{return [...a, ...x.results]}, [])];
      let actions = [];
      if (message.flags.ezd6.actions?.length) actions = [...message.flags.ezd6.actions];
      actions.push(`Rolled die ${results.length} - ${ezd6.d6pips[results[results.length-1].result]}`)
      return message.update({content:roll.total, flags:{ezd6:{results, actions}}});
    }
    let text = html.find('#chat-message').val();
    let formula = text.split(' ').find(s=>s.includes('d6'))
    if (!formula) return html.find('#chat-message').val(`/r 1d6`);
    let terms = Roll.parse(formula)
    if (e.originalEvent) {
      terms[0].number++;
    } else {
      terms[0].number--;
    }
    if (terms[0].number == 0) return html.find('#chat-message').val(``);
    formula = Roll.fromTerms(terms).formula
    html.find('#chat-message').val(`/r ${formula}`);*/
  })
  .contextmenu(function(){$(this).click()})
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
  //html.find(`#chat-controls > a`).css('margin', '.1em')
})

Hooks.on('getChatLogEntryContext', (html, options)=>{
  
  options.unshift({
    name: "Use Karma",
    icon: ezd6.karma,
    condition: li => {
      const message = game.messages.get(li.data("messageId"));
      return message.user.id == game.user.id && game.user.character.system.karma > 0 && !message.flavor.includes('Cast');
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
      return message.user.id == game.user.id && game.user.character.system.herodice > 0 ;
    },
    callback: li => {
      const message = game.messages.get(li.data("messageId"));
      return ezd6.useHeroDie(message)
    }
  });
});

ezd6.renderPlayerDialog = function() {
  let id = 'ezd6-player-dialog';
  if ($(`div#${id}`).length) 
    return ui.windows[$(`div#${id}`).data().appid].render(true).bringToTop();
  
  let columns = [ 
    ["strikes.value",   ezd6.strikes   , "Strikes"], 
    ["herodice",   ezd6.herodice     , "Hero Dice"],
    ["karma",   ezd6.karma, "Karma"]
    ];
  let d = new Dialog({title: `EZD6 P&S Dialog` ,  content: ``,  buttons: {},  render: async (html)=>{
  html.first().parent().css({background:'unset'});
  let div = `<div class="${id}" style=""> 
  <style>
  #${id} {width:auto !important;}
  div.${id} { width:auto !important; height: max-content; margin-top:0px;  z-index: 29;}
  div.macro > a.macro > img {border:unset;}
  div.macro > a.macro > img:hover {filter: drop-shadow(0px 0px 3px rgb(255 0 0 / 0.9)) !important;
  span.icons {margin-left: .5em}
  }
  </style><div style="width: max-content; display:grid; grid-template-columns: auto auto auto auto; column-gap: .25em; row-gap: .25em; color: white; font-size: 20px;">`;
  
  for (let user of game.users.filter(u=>u.character))
    div += `<span style="margin-right:.25em;">${user.character.name}</span>` + columns.reduce((acc, x, i)=>acc+=`<span style="">${Array(foundry.utils.getProperty(user.character.system, x[0])+1).join(x[1]+"&nbsp;")}${i==0?Array(Math.max(user.character.system.strikes.max-user.character.system.strikes.value+1, 0)).join('<i class="fa-solid fa-heart" style="color: black;-webkit-text-stroke: 1px red;"></i>&nbsp;'):''}</span>`, ``);
    //<span class="header-stats" style="margin-left:.5em;">
  
  div += `</div>`
  let $div = $(div);
  html.first().append($div);
  },//end render
    close: async (html)=>{
        //delete character.apps[d.appId];
        if (Hooks.sheetHook) Hooks.off('', Hooks.sheetHook);
        if (Hooks.ezd6playerui) Hooks.off('', Hooks.ezd6playerui)
        return;
      }
  }, {width: 'auto', height: 'auto', id}
  ).render(true);
  character.apps[d.appId] = d;
  
  
  if (Hooks.ezd6playerui) Hooks.off('', Hooks.ezd6playerui)
  Hooks.ezd6playerui = 
    Hooks.on('updateActor', (actor, updates)=>{
      d.render(true, {height: 'auto', width: 'auto'})
    })
}

ezd6.renderRabbleRouserDialog = function() {
  if (!game.user.isGM) return;
  let id = 'ezd6-rr-dialog';
  if ($(`div#${id}`).length) 
    return ui.windows[$(`div#${id}`).data().appid].render(true).bringToTop();
    
  let columns = [ 
      {key:"name", icon:'<i class="fa-solid fa-user"></i>', label:"Character Name"}, 
      {key:"armorsave", icon: '<i class="fa-solid fa-shield"></i>', label: "Wound Save"}, 
      {key:"miraculoussave", icon: '<i class="fa-solid fa-hand-holding-heart"></i>', label:"Miraculous Save"}, 
      {key:"strikes.value", icon: ezd6.strikes, label:"Strike"}, 
      {key:"herodice", icon: ezd6.herodice, label:"Hero Die"},
      {key:"karma", icon: ezd6.karma, label: "Karma"}
    ];
    
  let d = new Dialog({title: "EZD6 RR Dialog",  content: ``,  buttons: {},  render: async (html)=>{
      //position: absolute; top: 30px; left: 0px;
  html.first().parent().css({background:'unset'})//border: 1px solid var(--color-border-dark);border-radius: 5px; background-image: url(../ui/denim075.png); 
  let div = `<div class="${id}"> 
  <style>
  div.${id} {  width: max-content; height: max-content;}
  </style>
  <div style="display:grid; grid-template-columns: repeat(${columns.length}, auto); column-gap: .75em; row-gap: .25em; color: white; font-size: 20px;">`;
    div += columns.reduce((acc, x, i)=>acc+=`<div style="border-bottom: 1px solid white;" title="${x.label}">${x.icon}</div>`, ``);
  for (let user of game.users.filter(u=>!!u.character))//.filter(u=>!u.isGM)) 
    div += columns.reduce((acc, x, i)=>acc+=`<div style="text-align:${i?"center":"left"};" title="${x.label}"><a class="ezd6-ui-link" data-key="${x.key}" data-label="${x.label}" data-user="${user.id}">${foundry.utils.hasProperty(user.character.system, x.key)?foundry.utils.getProperty(user.character.system, x.key):`<img src="${user.character.img}" height=20>&nbsp;${user.character.name}`}</a></div>`, ``);
  div += `</div></div>`;
  let $div = $(div);

  $div.find(`a.ezd6-ui-link`).click(async function(e){
    let user = game.users.get(this.dataset.user);
    let character = user.character;
    if (this.dataset.key=="strikes.value" && !e.originalEvent && user.character.system.strikes.value == user.character.system.strikes.max) return ui.notifications.warn(`Max strikes reached.`);
    if (foundry.utils.getProperty(user.character.system, this.dataset.key)-1<0 && !!e.originalEvent) return ui.notifications.warn(`Value cannot be negative.`);
    if (!foundry.utils.hasProperty(user.character.system, this.dataset.key) && !!e.originalEvent) 
      return character.sheet.render(true);
    if (!foundry.utils.hasProperty(user.character.system, this.dataset.key) && !e.originalEvent)
      return game.macros.getName('Freeform Character Sheet').execute(character.id);
    //if (this.dataset.key=="hd" && user.flags.ezd6["hd"]==1 && !e.originalEvent) //
    //return ui.notifications.warn("A player may only have 1 hero die.");
    await character.update({system:{[this.dataset.key]: (e.shiftKey||!!e.originalEvent)?+foundry.utils.getProperty(character.system, this.dataset.key)-1:+foundry.utils.getProperty(character.system, this.dataset.key)+1}});
    let tokens = character.getActiveTokens();
    let down = (e.shiftKey||!!e.originalEvent);
    let text = this.dataset.label.endsWith('s')?this.dataset.label.substring(0, 6).toLowerCase():this.dataset.label.toLowerCase()
    //ChatMessage.create({content: `${down?'takes':'gives'} a ${this.dataset.label} ${down?'from':'to'} ${character.name} - ${columns.find(e=>e.key==this.dataset.key).icon}`})
    text = (down?'- ':'+ ') + text ;
    for (let t of tokens)
    canvas.interface.createScrollingText(t.center, text, {
          anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
          direction: down ? CONST.TEXT_ANCHOR_POINTS.BOTTOM: CONST.TEXT_ANCHOR_POINTS.TOP,
          distance: (2 * t.h),
          fontSize: 28,
          stroke: 0x000000,
          strokeThickness: 4,
          jitter: 0.25
        });
    //ChatMessage.create({content : `${character.name} ${(e.shiftKey||!!e.originalEvent)?"loses":"gains"} a ${this.dataset.label.endsWith('s')?this.dataset.label.substring(0, 6).toLowerCase():this.dataset.label.toLowerCase()}`})
  }).contextmenu(async function(e){ $(this).click(); })
  html.first().append($div);

  // return to dialog definition
  },
    close: async (html)=>{
        if (Hooks.ezd6gmui) Hooks.off('', Hooks.ezd6gmui)
        return;
      }
  }, {width: 'auto', height: 'auto', id}
  ).render(true);

  if (Hooks.ezd6gmui) Hooks.off('', Hooks.ezd6gmui)
  Hooks.ezd6gmui = 
    Hooks.on('updateActor', (actor, updates)=>{
      d.render(true, {height: 'auto', width: 'auto'})
    })
}


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
  console.log(roll)
  if (roll.total==1) ezd6.confirmCrit(message, brutal);
}


ezd6.useKarma = async function(message) {
  //let message = game.messages.contents.reverse().filter(m=>m.user==game.user && m.flags.ezd6?.results)[0];
  let character = game.user.character;
  if (!character) return ui.notifications.warn("No Character Assigned");
  if (character.system.karma == 0 ) return ui.notifications.warn("You do not have Karma to use.");
  let actions = [];
  if (message.flags.ezd6?.actions) actions = message.flags.ezd6?.actions;
  if (message.flavor.toUpperCase().includes('CAST')) return ui.notifications.notify('You cannot use Karma on cast rolls.')
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
  await game.user.character.update({system:{karma:character.system.karma-1}});
  return await message.update({flags:{ezd6:{results, actions}}});
  //await ezd6.socket.executeAsGM("updateChatMessage", message.id, {flags:{ezd6:{results, actions}}});
}

ezd6.useHeroDie = async function(message) {
  //let message = game.messages.contents.reverse().filter(m=>m.user==game.user && m.flags.ezd6?.results)[0];
  let character = game.user.character;
  if (!character) return ui.notifications.warn("No Character Assigned");
  if (character.system.herodice == 0 ) return ui.notifications.warn("You do not have a Hero Die to use.");
  let actions = [];
  if (message.flags.ezd6?.actions) actions = message.flags.ezd6?.actions;
  let results = [...message.flags.ezd6?.results];
  let index = results.findLastIndex(r=>r.active)
  if (message.flavor.toUpperCase().includes('CAST') && results.find(r=>r.result == 1)) index = results.findIndex(r=>r.result == 1)
  let result = results[index];
  let roll = result.result;
  if (roll == 6) return ui.notifications.warn("You do not need to use a Hero Die. You rolled of 6.");
  let hd = await new Roll('1d6').roll();
  if (game.modules.get('dice-so-nice')?.active) await game.dice3d.showForRoll(hd, game.user, true);
  results[index].result = hd.total;
  let save = Number(message.rolls[0].formula.split('>=')[1]);
  if (results[index].hasOwnProperty('success') && (results[index].result == 6 || results[index].result >= save)) results[index].success = true;
  if (results[index].hasOwnProperty('success') && results[index].result <  save) results[index].success = false;
  actions.push(`${game.user.character?.name || game.user.name} used a Hero Die on die ${index+1} - ${ezd6.herodice}</i>`);
  await game.user.character.update({system:{herodice:character.system.herodice-1}});
  return await message.update({flags:{ezd6:{results, actions}}});
  //await ezd6.socket.executeAsGM("updateChatMessage", message.id, {flags:{ezd6:{results, actions}}});
}

Hooks.once('ready', async ()=>{
  let pack = game.packs.get('ezd6-roll-messages.ezd6-macros');
  let folder = game.folders.find(f=>f.type=="Macro" && f.name=="EZD6")
  if (!folder) folder = await Folder.create({type:"Macro", name:"EZD6"})
  let updateNeeded = [];
  let map = {};
  if (!pack) return;
  for (let m of pack.index) {
    let packMacro = await pack.getDocument(m._id);
    //console.log(m._id, packMacro.flags['ezd6-roll-messages']?.id)
    let gameMacro = game.macros.find(macro=>macro.flags['ezd6-roll-messages']?.id == packMacro.flags['ezd6-roll-messages']?.id)
    if (!gameMacro) gameMacro = await Macro.create({...packMacro, ...{folder: folder.id, ownership:{default: CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER}}});
    map[gameMacro.id] = m._id;
    if (packMacro.command != gameMacro.command)
      updateNeeded.push(gameMacro)
  }
  if (!updateNeeded.length) return console.log('No EZD6 macro updates detected.');
  let d = new Dialog({
    title: 'EZD6 Macros To Update',
    content: updateNeeded.reduce((a,m)=>a+=`<div><h3>${m.name}<a class="update" style="float:right;" data-macro-id="${m.id}" data-pack-id="${map[m.id]}">Update</a></h3></div>`, ``),
    buttons:{
      updateAll:{ label: 'Update All', callback: async (html)=>{
        for (let m of updateNeeded) {
          let packMacro = await pack.getDocument(map[m.id]);
          await m.update({command: packMacro.command});
        }
      }},
      cancel: { label: 'Cancel', callback:(html)=>{
        d.close();
      }}
    },
    render: (html)=>{
      html.find('a.update').click(async function(){
        let packMacro = await pack.getDocument(this.dataset.packId);
        await game.macros.get(this.dataset.macroId).update({command: packMacro.command})
        $(this).text('Updated').off('click');
      })
    },
    close: ()=>{return}
  }).render(true)
})

ezd6.rollDialog = async function(title) {
  let pips = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
  let position = {top: window.innerHeight-300};
  let formula = await Dialog.wait({
         title,
         content:  `
         <center style="margin-bottom: .5em;">
         <div class="dice"></div>
          <button style="width: 80px" name="bane">Bane</button>
          <input style="width: 30px; display: none;" type="number" value="0" id="boon-bane"></input>
          <input style="width: 100px; height: 32px; " type="text" value="1d6" name="formula"></input>
          <button style="width: 80px" name="boon">Boon</button>
          </center>
         `,
         render: (html) => {
          html.parent().css({background:'#111', color: 'white'})
            html.find('button, input').css({background:'unset', color: 'white'})
           html.find('.dice').html([...Array(Math.abs(+html.find('#boon-bane').val())+1)].reduce((a,x,i)=> a += `<i style="font-size: 32px; margin: .1em;" class="fa-solid fa-dice-${pips[i+1]}"></i>`, ""));
           //html.find('.fa-solid').css('color', 'white')
            html.find(`button[name="boon"]`).click(function(){
              if (+html.find('#boon-bane').val()==5) return;
              html.find('#boon-bane').val(+html.find('#boon-bane').val()+1);
              html.find(`input[name="formula"]`).click();
            });
            
            html.find(`button[name="bane"]`).click(function(){
              if (+html.find('#boon-bane').val()==-5) return;
              html.find('#boon-bane').val(+html.find('#boon-bane').val()-1);
              
              html.find(`input[name="formula"]`).click();
            });
            
            html.find(`input[name="formula"]`).click(function(){
                      let boonbane = +html.find('#boon-bane').val();
                      let addDice = Math.abs(boonbane);
                      let mod = (boonbane>0)?"kh1":"kl1";
                      let num = 1 + addDice
                      if (addDice==0) mod = "";
                      $(this).val(num+"d6"+mod);
                      html.find('.dice').html([...Array(Math.abs(+html.find('#boon-bane').val())+1)].reduce((a,x,i)=> a += `<i style="font-size: 32px; margin: .1em;" class="fa-solid fa-dice-${pips[i+1]}"></i>`, ""));//
                      if (+html.find('#boon-bane').val() == 0) return html.find('.fa-solid').css('color: white;')
                      if (+html.find('#boon-bane').val() > 0) return html.find('.fa-solid').css('color', 'limegreen')
                      if (+html.find('#boon-bane').val() < 0) return html.find('.fa-solid').css('color', 'red')
                    });
         },
         buttons: {
             roll : { label : "Roll", callback : (html) => { 
                      return html.find(`input[name="formula"]`).val();
                      }
                  },
             cancel: { label : "Cancel", callback : (html) => { 
                      return '';
                      }
                  }
         },
         default: 'roll',
         close:   html => {
             return ''}
           },position
        )
return formula;
}

ezd6.magickDialog = async function(title) {
  let pips = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
  let position = {top: window.innerHeight-300}
let formula = await Dialog.wait({
         title: title,
         content:  `
         <center style="margin-bottom: .5em;">
         <div class="dice"></div>
          <input style="width: 30px;font-size: 30px; border: none; display: none;" readonly type="number" value="1" id="power-level"></input>
          <button style="width: 80px" name="minus"><i class="fa-solid fa-minus"></i></button>
          <input style="width: 100px; height: 32px; " type="text" value="1d6" name="formula"></input>
          <button style="width: 80px" name="plus"><i class="fa-solid fa-plus"></i></button>
          </center>
         `,
         render: (html) => {
          html.parent().css({background:'#111', color: 'white'})
            html.find('button, input').css({background:'unset', color: 'white'})
           html.find('.dice').html([...Array(Math.abs(+html.find('#power-level').val())+1)].reduce((a,x,i)=> a += `<i style="font-size: 32px; margin: .1em;" class="fa-solid fa-dice-${pips[i]}"></i>`, ""));
            html.find(`button[name="plus"]`).click(function(){
              html.find('#power-level').val(Math.min(+html.find('#power-level').val()+1, game.user.isGM?6:3));
              html.find(`input[name="formula"]`).click();
            });
            
            html.find(`button[name="minus"]`).click(function(){
              html.find('#power-level').val(Math.max(+html.find('#power-level').val()-1, 1));
              html.find(`input[name="formula"]`).click();
            });
            
            html.find(`input[name="formula"]`).click(function(){
                      let powerLevel = +html.find('#power-level').val();
                      if (powerLevel==1) mod = "d6";
                      else mod = "d6kh";
                      $(this).val(powerLevel+mod);
                      html.find('.dice').html([...Array(Math.abs(+html.find('#power-level').val())+1)].reduce((a,x,i)=> a += `<i style="font-size: 32px; margin: .1em;" class="fa-solid fa-dice-${pips[i]}"></i>`, ""));
                    });
         },
         buttons: {
             roll : { label : `Roll`, callback : (html) => { 
                      return html.find(`input[name="formula"]`).val();
                      }
                  },
             cancel: { label : "Cancel", callback : (html) => { 
                      return ''
                      }
                  }
         },
         default: 'roll',
         close:   html => {return ''}
         },position
        );
console.log(formula);
return formula;
}

Hooks.once("setup", async () => {
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
