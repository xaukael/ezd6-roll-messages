var ezd6 = {};
ezd6.d6pips = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'].map((p,i)=>i?`<i class="fa-solid fa-dice-${p}"></i>`:`<i class="fa-solid fa-square"></i>`);
ezd6.herodice = `<i class="fa-solid fa-square" style="color:limegreen;background:unset;border:unset;"></i>`;
ezd6.karma = `<i class="fa-solid fa-circle" style="color:gold;background:unset;border:unset;"></i>`;
ezd6.strikes = '<i class="fa-solid fa-heart"  style="color:red;background:unset;border:unset;"></i>';

ezd6.updateChatMessage = async function(id, update) {
  return await game.messages.get(id).update(update);
}

Hooks.once("socketlib.ready", () => {
	ezd6.socket = socketlib.registerModule("ezd6-roll-messages");
	ezd6.socket.register("updateChatMessage", ezd6.updateChatMessage);
});

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
  message.data.update({flags:{ezd6:{results: message.rolls[0].dice.filter(d=>d.faces==6).reduce((a,x)=>{return [...a, ...x.results]}, [])}}});
});

// this does all the formatting for chat messages using Font-Awesome d6 glyphs
Hooks.on('renderChatMessage', (message, html)=>{
  if (message.flavor.includes("Draws a result")) return;
  if (!message.rolls?.length) return;
  if (message.rolls[0].dice.filter(d=>d.faces==6).length!=message.rolls[0].dice.length) return; 
  html.find('.message-sender').css({color: message.user.color, fontWeight: 'bold'})
  let flavor = html.find('.flavor-text').text().trim();
  if (flavor) html.find('.flavor-text').html(`<h3>${flavor}</h3>`)

  if (!message.flags.ezd6?.results) return;
  //console.log(message.flags.ezd6.results);
  let results = [...message.flags.ezd6.results];
  let actions = [];
  if (message.flags.ezd6?.actions?.length)
    actions = [...message.flags.ezd6.actions];
  if (message.flavor.includes('Cast') && results.map(r=>r.result).includes(1))
    for (let r of results) 
      if (r.result == 1) r.active = true;
      else r.active = false;
  let content = results.reduce((acc, r, i)=> {
    let color = 'inherit';
    if (message.flavor.includes('Attack') && r.result == 6 && !r.discarded) color = "limegreen";
    if (r.hasOwnProperty('success') && !r.success) color ="grey";
    if (r.hasOwnProperty('discarded') && r.discarded) color ="grey";
    if (!r.active) color = "grey";
    if (message.flavor.includes('Spell') && r.result == 1) color = "red";
    return acc += `<span data-index="${i}" data-roll="${r.result}" class="die" style="position: relative; font-size: 32px; color: ${color};">${ezd6.d6pips[r.result]}</span>&nbsp;`;
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
  html.find('div.message-content').html(content);
  html.find('img.target').mouseover(function(e){
    let tok = canvas.tokens?.get($(this).data().id);
    let $div = $(`<div id="${tok.id}-marker" class="token-marker ${tok.id}" style="position: absolute; top: ${tok.y}px; left: ${tok.x}px; display:block;" data-tokenid="${tok.id}">
      <style>
      .token-marker {
        width: ${tok.w}px;
        height: ${tok.h}px;
        border: 3px solid red;
        border-radius: 8px;
      }
      </style></div>`);
      $('#hud').append($div);
  }).mouseout(function(e) {
    $('#hud').find('div.token-marker').remove();
  });
  
  if (!message.flavor.toUpperCase().includes('SPELL'))
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
    if (results[index].hasOwnProperty('success') && results[index].result==6) results[index].success = true;
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
    if (message.flags.ezd6?.actions) actions = message.flags.ezd6?.actions;
    let index = +$(this).parent().data().index;
    let roll = +$(this).parent().data().roll;
    if (roll == 6) return ui.notifications.warn("Why would you try to use a Hero Die to reroll a 6?");
    if (results[index].discarded) return ui.notifications.warn(`You cannot use a Hero Die on a discarded roll. Why would you?`);
    let hd = await new Roll('1d6').roll();
    if (game.modules.get('dice-so-nice')?.active) await game.dice3d.showForRoll(hd, game.user, true);
    results[index].result = hd.total;
    actions.push(`${game.user.character?.name || game.user.name} used a Hero Die on die ${index+1} - ${ezd6.herodice}</i>`);
    if (results[index].hasOwnProperty('success') && results[index].result==6) results[index].success = true;
    //await message.update({flags:{ezd6:{results, actions}}})
    await ezd6.socket.executeAsGM("updateChatMessage", message.id, {flags:{ezd6:{results, actions}}});
    await game.user.character.update({system:{herodice:game.user.character.system.herodice-1}});
  });
})

Hooks.once('ready', async ()=>{
  let pack = game.packs.get('ezd6-roll-messages.ezd6-macros');
  let folder = game.folders.find(f=>f.type=="Macro" && f.name=="EZD6")
  if (!folder) folder = await Folder.create({type:"Macro", name:"EZD6"})
  let updateNeeded = [];
  let map = {};
  if (!pack) return;
  for (let m of pack.index) {
    let packMacro = await pack.getDocument(m._id);
    console.log(m._id, packMacro.flags['ezd6-roll-messages']?.id)
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
