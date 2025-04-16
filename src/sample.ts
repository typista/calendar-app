// イベントデータを取得するサンプルコード
async function getEvents() {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-events`, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }

    const events = await response.json();
    
    // Date文字列をDateオブジェクトに変換
    return events.map((event: any) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    }));
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

// 使用例
async function example() {
  const events = await getEvents();
  console.log('Calendar Events:', events);
  
  // イベントの件数を表示
  console.log('Total events:', events.length);
  
  // 特定の日付のイベントをフィルタリング
  const today = new Date();
  const todaysEvents = events.filter(event => 
    event.start.getDate() === today.getDate() &&
    event.start.getMonth() === today.getMonth() &&
    event.start.getFullYear() === today.getFullYear()
  );
  console.log('Today\'s events:', todaysEvents);
  
  // イベントのタイトルだけを抽出
  const eventTitles = events.map(event => event.title);
  console.log('Event titles:', eventTitles);
}