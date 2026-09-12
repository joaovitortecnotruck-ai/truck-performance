delete from public.messages
where order_id = 'f3cc5be7-ba48-4077-b4a8-b13609f8d6b4'
  and body in (
    'teste tempo real 2',
    'teste realtime debug',
    'teste sem filtro',
    'Mensagem via API para testar tempo real',
    'teste 2 sem filtro no canal',
    'teste websocket raw',
    'teste auth raw',
    'Confirmando: tempo real corrigido!'
  );
