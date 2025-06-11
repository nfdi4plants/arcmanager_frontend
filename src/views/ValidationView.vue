<script lang="ts" setup>
import { computed } from 'vue';


type ValidateData = {
  Assays: Array<Object>,
  Studies: Array<Object>,
  ARC_Structure: boolean | string,
  Investigation: {
    identifier: boolean,
    title: boolean,
    description: boolean,
    contacts: Array<boolean | string>,
  },
  ARC: boolean,
};

type ValidationViewProps = {
  validate: boolean,
  slide: string,
  validateData: ValidateData
}

const props = defineProps<ValidationViewProps>()

const emit = defineEmits(['update:validate', 'update:slide'])

const modelValidate = computed({
  get: () => props.validate,
  set: (value: boolean) => emit('update:validate', value)
})

const modelSlide = computed({
  get: () => props.slide,
  set: (value: string) => emit('update:slide', value)
})

</script>


<template>
  <q-dialog v-model="modelValidate">
    <q-carousel style="width: 80%" v-model="modelSlide" transition-prev="scale" transition-next="scale" swipeable
      animated control-color="white" navigation padding arrows height="80%" width
      class="bg-primary text-white shadow-1 rounded-borders">
      <!-- BASIC STRUCTURE -->
      <q-carousel-slide name="structure" class="column no-wrap flex-center">
        <h5>Basic structure:</h5>
        <div class="q-mt-md text-center" v-if="typeof validateData.ARC_Structure === 'boolean'">
          Your ARC structure is valid. It contains all necessary folders and
          files.
        </div>
        <div class="q-mt-md text-center" v-else-if="typeof validateData.ARC_Structure === 'string'">
          Your ARC structure is not valid. {{ validateData.ARC_Structure }}
        </div>
      </q-carousel-slide>
      <!-- ASSAYS -->
      <q-carousel-slide name="assays" class="column no-wrap flex-center">
        <h5>Assays:</h5>
        <div class="q-pa-none text-center">
          <q-list>
            <q-item v-for="item in validateData.Assays">
              <q-item-section>{{ Object.keys(item)[0] }}
                <q-item-label caption v-if="typeof Object.values(item)[0] == 'string'">{{ Object.values(item)[0] }}
                </q-item-label>
              </q-item-section>
              <q-item-section avatar>
                <q-icon v-if="typeof Object.values(item)[0] === 'boolean'" name="done"
                  :color="validateData.ARC ? 'gold' : 'green'" />
              </q-item-section>
            </q-item>
          </q-list>
          <span v-if="validateData.Assays.length == 0">No assays found!</span>
        </div>
      </q-carousel-slide>
      <!-- STUDIES-->
      <q-carousel-slide name="studies" class="column no-wrap flex-center">
        <h5>Studies:</h5>
        <div class="q-pa-sm text-center">
          <span v-if="validateData.Studies.length == 0">No studies found!</span>
          <q-list>
            <q-item v-for="item in validateData.Studies">
              <q-item-section>{{ Object.keys(item)[0] }}
                <q-item-label caption v-if="typeof Object.values(item)[0] == 'string'">{{ Object.values(item)[0]
                }}
                </q-item-label>
              </q-item-section>
              <q-item-section avatar v-if="typeof Object.values(item)[0] == 'boolean'">
                <q-icon name="done" :color="validateData.ARC ? 'gold' : 'green'" />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </q-carousel-slide>
      <!-- INVESTIGATION -->
      <q-carousel-slide v-if="validateData.Investigation" name="investigation" class="column no-wrap flex-center">
        <h5>Investigation:</h5>
        <div class="q-pa-none text-center">
          <!-- Identifier-->
          <q-item>
            <q-item-section>Identifier</q-item-section>
            <q-item-section avatar>
              <q-icon v-if="validateData.Investigation.identifier" name="done"
                :color="validateData.ARC ? 'gold' : 'green'" />
              <q-icon v-else name="clear" color="red" /></q-item-section>
          </q-item>
          <!-- Title -->
          <q-item>
            <q-item-section>Title</q-item-section>
            <q-item-section avatar>
              <q-icon v-if="validateData.Investigation.title" name="done"
                :color="validateData.ARC ? 'gold' : 'green'" />
              <q-icon v-else name="clear" color="red" />
            </q-item-section>
          </q-item>
          <!-- Description -->
          <q-item>
            <q-item-section>Description</q-item-section>
            <q-item-section avatar>
              <q-icon v-if="validateData.Investigation.description" name="done"
                :color="validateData.ARC ? 'gold' : 'green'" />
              <q-icon v-else name="clear" color="red" />
            </q-item-section>
          </q-item>
          <!-- Contacts-->
          <q-item>
            <q-item-section>
              <q-expansion-item label="Contacts">
                <ol>
                  <li v-for="contact in validateData.Investigation.contacts">
                    <span v-if="typeof contact === 'boolean'">Is a valid contact</span><span v-else>{{ contact }}</span>
                  </li>
                </ol>
              </q-expansion-item></q-item-section>
          </q-item>
        </div>
      </q-carousel-slide>
      <q-carousel-slide v-if="validateData.ARC" name="Arc" class="column no-wrap flex-center">
        <div class="q-pa-none text-center">
          <h4 class="text-gold">
            Your ARC is fully valid! <q-icon name="check" color="gold" />
          </h4>
        </div>
      </q-carousel-slide>
    </q-carousel>
  </q-dialog>
</template>
