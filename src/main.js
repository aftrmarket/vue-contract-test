import { createApp } from 'vue'
import './index.css'
import VueSweetalert2 from 'vue-sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { basicSetup } from 'codemirror';
import VueCodemirror from 'vue-codemirror';
import App from './App.vue'

const app = createApp(App);
app.use(VueSweetalert2);
app.use(VueCodemirror, {
    // optional default global options
    autofocus: true,
    disabled: false,
    indentWithTab: true,
    tabSize: 4,
    placeholder: 'Enter GraphQL Query',
    extensions: [basicSetup]
    // ...
  });


app.mount('#app');