const { createApp } = Vue;
const app = createApp({});

const Homepage = {
  data: function () {
    return {
      ws: null,
      transactions: [],
      blockchain: [],
    }
  },
  methods: {
    createSocket () {
      var wsUri = "wss://gd.wlkn.nl:8000/monitor";
      this.ws = new WebSocket(wsUri);

      this.ws.onopen = (ev) => { // connection is open
        console.log(`Connected at: ${wsUri}`);
        this.ws.send('Hello Server!')
      }

      this.ws.onmessage = event => {
        try {
          var obj = JSON.parse(event.data);

          this.transactions.push(obj);

          if (this.transactions.length > 10 ) {
            this.transactions.pop();
          }

          switch(obj.type) {
            case 'slider':
              this.slider1 = parseInt(obj.value);
              break;
            
            default:
              break;
          }

        } catch (error) {
          console.log(error);
        }
        
      };

      this.ws.onclose = (error) => {
        console.log('Socket is closed. Reconnect will be attempted in 1 second.', error.reason);
        this.ws = null;
        setTimeout(() => {
          this.createSocket();
        }, 1000);
      };

      this.ws.onerror = (error) => {
        console.error('Socket encountered error: ', error.message, 'Closing socket');
        this.ws.close();
      };

    },  
    heartbeat(){
      console.log('ping from server :D')
    }
  },
  watch: {
  },
  computed:{    
  },
  mounted () {
    this.createSocket();

    axios.get('/blockchain').then((response) => {
      return this.blockchain = response.data;
    });


  },
  template: `<div class="col-6">
          <h2>Latest Blocks</h2>
            <blocks :blocks="blockchain"></blocks>
        </div>

        <div class="col-6">
          <h2>Latest Transactions</h2>
          <transactions :txs="transactions"></transactions>
        </div>`
}

app.component('transactions', {
  props: {
    txs: {
      type: Array,
      required: true
    }
  },
  data: function () {
    return {}
  },
  methods: {},
  computed: {},
  mounted() {
  },
  template: `
    <template v-for="(tx, index) in txs" :key="tx.hash">
      <div>{{tx.blockHash}}</div>
    </template>`
})

app.component('blocks', {
  props: {
    blocks: {
      type: Array,
      required: true
    }
  },
  data: function () {
    return {}
  },
  methods: {},
  computed: {},
  mounted() {
  },
  template: `
    <template v-for="(block, index) in blocks" :key="block.hash">
      <div>{{block.hash}}</div>
    </template>`
})


const PathNotFound = {
  template: `<div>
      <div class="row">
        <h2>Error 404</h2>
      </div>
    </div>` 
};

const routes = [
{ path: '/', component: Homepage},
//{ path: '/block/:id(\\d+)', component: AccountDetail, props: route => ({ id: Number.parseInt(route.params.id, 10) }) },
{ path: '/:pathMatch(.*)*', component: PathNotFound }
]

const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes, // short for `routes: routes`
})

app.use(router);

app.directive('blur', {
  mounted(el) {
    el.onfocus =  (ev) => ev.target.blur()
  }
})

const vm = app.mount('#app');


