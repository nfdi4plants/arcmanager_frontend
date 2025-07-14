<script lang="ts" setup>
import { computed } from 'vue'

type ValidationResult = {
  isValid: boolean
  messages: string[]
}

type ValidationContact = {
  lastName: boolean
  firstName: boolean
  email: boolean
  affiliation: boolean
  orcid: boolean
}

type ValidationDir = {
  name: string
  structure: ValidationResult
  isaFileHasSecondSheet: ValidationResult
}

export type ValidationData = {
  structure: ValidationResult
  isaInvestigation: {
    correctSheetName: ValidationResult
    requiredFields: {
      identifier: boolean
      title: boolean
      description: boolean
    }
    additionalFields: {
      submissionDate: boolean
      releaseDate: boolean
    }
    contacts: ValidationContact[]
    messages: string[]
  }
  assays: ValidationDir[]
  studies: ValidationDir[]
  invenioPublishable: ValidationResult
}

type ValidationViewProps = {
  validate: boolean
  slide: string
  validateData: ValidationData
}

const props = defineProps<ValidationViewProps>()
const emit = defineEmits(['update:validate', 'update:slide'])

const modelValidate = computed({
  get: () => props.validate,
  set: (val: boolean) => emit('update:validate', val)
})

const modelSlide = computed({
  get: () => props.slide,
  set: (val: string) => emit('update:slide', val)
})

const getColor = (...values: boolean[]) => {
  if (values.every(Boolean)) return 'green'
  if (values.some(Boolean)) return 'gold'
  return 'red'
}

const getIcon = (...values: boolean[]) =>
  values.some(Boolean) ? 'done' : 'clear'
</script>

<template>
  <q-dialog v-model="modelValidate">
    <q-carousel v-model="modelSlide" animated swipeable navigation arrows padding transition-prev="scale"
      transition-next="scale" control-color="white" height="80%" style="width: 80%"
      class="bg-primary text-white shadow-1 rounded-borders">
      <!-- Structure -->
      <q-carousel-slide name="structure" class="column no-wrap flex-center">
        <h5>Basic Structure</h5>
        <div class="q-mt-md text-center">
          <div v-if="validateData.structure.isValid">
            Your ARC structure is valid. It contains all necessary folders and files.
          </div>
          <div v-else>
            {{ validateData.structure.messages.join('\n') }}
          </div>
        </div>
      </q-carousel-slide>

      <!-- Assays -->
      <q-carousel-slide name="assays" class="column no-wrap flex-center">
        <h5>Assays</h5>
        <q-list class="q-pa-sm text-center">
          <q-item v-for="item in validateData.assays" :key="item.name">
            <q-item-section>
              <div class="row items-center justify-center">
                <strong>{{ item.name }}</strong>
                <q-icon class="q-ml-sm" size="1.5rem"
                  :name="getIcon(item.structure.isValid, item.isaFileHasSecondSheet.isValid)"
                  :color="getColor(item.structure.isValid, item.isaFileHasSecondSheet.isValid)" />
              </div>
              <div class="row">
                <q-item-label>Structure</q-item-label>
                <q-item-section avatar>
                  <q-icon class="q-ml-sm" :name="getIcon(item.structure.isValid)"
                    :color="getColor(item.structure.isValid)" />
                </q-item-section>
                <q-item-label caption>{{ item.structure.messages.join(', ') }}</q-item-label>
              </div>
              <div class="row">
                <q-item-label>ISA file has second sheet</q-item-label>
                <q-item-section avatar>
                  <q-icon class="q-ml-sm" :name="getIcon(item.isaFileHasSecondSheet.isValid)"
                    :color="getColor(item.isaFileHasSecondSheet.isValid)" />
                </q-item-section>
                <q-item-label caption>{{ item.isaFileHasSecondSheet.messages.join(', ') }}</q-item-label>
              </div>
            </q-item-section>
          </q-item>
          <div v-if="validateData.assays.length === 0">No assays found!</div>
        </q-list>
      </q-carousel-slide>

      <!-- Studies -->
      <q-carousel-slide name="studies" class="column no-wrap flex-center">
        <h5>Studies</h5>
        <q-list class="q-pa-sm text-center">
          <q-item v-for="item in validateData.studies" :key="item.name">
            <q-item-section>
              <div class="row items-center justify-center">
                <strong>{{ item.name }}</strong>
                <q-item-section avatar>
                  <q-icon class="q-ml-sm" :name="getIcon(item.structure.isValid, item.isaFileHasSecondSheet.isValid)"
                    :color="getColor(item.structure.isValid, item.isaFileHasSecondSheet.isValid)" />
                </q-item-section>
              </div>
              <div class="row">
                <q-item-label>Structure</q-item-label>
                <q-icon class="q-ml-sm" :name="getIcon(item.structure.isValid)"
                  :color="getColor(item.structure.isValid)" />
                <q-item-label caption>{{ item.structure.messages.join('\n') }}</q-item-label>
              </div>
              <div class="row">
                <q-item-label>ISA file has second sheet</q-item-label>
                <q-item-section avatar>
                  <q-icon class="q-ml-sm" :name="getIcon(item.isaFileHasSecondSheet.isValid)"
                    :color="getColor(item.isaFileHasSecondSheet.isValid)" />
                </q-item-section>
                <q-item-label caption>{{ item.isaFileHasSecondSheet.messages.join('\n') }}</q-item-label>
              </div>
            </q-item-section>
          </q-item>
          <div v-if="validateData.studies.length === 0">No studies found!</div>
        </q-list>
      </q-carousel-slide>

      <!-- Investigation -->
      <q-carousel-slide name="investigation" v-if="validateData.isaInvestigation" class="column no-wrap flex-center">
        <h5>ISA Investigation</h5>
        <div class="q-pa-sm text-left">
          <strong>Required Fields</strong>
          <q-item dense>
            <q-item-section>Identifier</q-item-section>
            <q-item-section avatar>
              <q-icon :name="getIcon(validateData.isaInvestigation.requiredFields.identifier)"
                :color="getColor(validateData.isaInvestigation.requiredFields.identifier)" />
            </q-item-section>
          </q-item>
          <q-item dense>
            <q-item-section>Title</q-item-section>
            <q-item-section avatar>
              <q-icon :name="getIcon(validateData.isaInvestigation.requiredFields.title)"
                :color="getColor(validateData.isaInvestigation.requiredFields.title)" />
            </q-item-section>
          </q-item>
          <q-item dense>
            <q-item-section>Description</q-item-section>
            <q-item-section avatar>
              <q-icon :name="getIcon(validateData.isaInvestigation.requiredFields.description)"
                :color="getColor(validateData.isaInvestigation.requiredFields.description)" />
            </q-item-section>
          </q-item>

          <div class="q-mt-md"><strong>Additional Fields</strong></div>
          <q-item dense>
            <q-item-section>Submission Date</q-item-section>
            <q-item-section avatar>
              <q-icon :name="getIcon(validateData.isaInvestigation.additionalFields.submissionDate)"
                :color="getColor(validateData.isaInvestigation.additionalFields.submissionDate)" />
            </q-item-section>
          </q-item>
          <q-item dense>
            <q-item-section>Release Date</q-item-section>
            <q-item-section avatar>
              <q-icon :name="getIcon(validateData.isaInvestigation.additionalFields.releaseDate)"
                :color="getColor(validateData.isaInvestigation.additionalFields.releaseDate)" />
            </q-item-section>
          </q-item>

          <q-expansion-item label="Contacts" class="q-mt-md">
            <ol>
              <li v-for="(contact, index) in validateData.isaInvestigation.contacts" :key="index">
                <q-item dense>
                  <q-item-section>Last Name</q-item-section>
                  <q-item-section avatar>
                    <q-icon :name="getIcon(contact.lastName)" :color="getColor(contact.lastName)" />
                  </q-item-section>
                </q-item>
                <q-item dense>
                  <q-item-section>First Name</q-item-section>
                  <q-item-section avatar>
                    <q-icon :name="getIcon(contact.firstName)" :color="getColor(contact.firstName)" />
                  </q-item-section>
                </q-item>
                <q-item dense>
                  <q-item-section>Email</q-item-section>
                  <q-item-section avatar><q-icon :name="getIcon(contact.email)" :color="getColor(contact.email)" />
                  </q-item-section>
                </q-item>
                <q-item dense>
                  <q-item-section>Affiliation</q-item-section>
                  <q-item-section avatar><q-icon :name="getIcon(contact.affiliation)"
                      :color="getColor(contact.affiliation)" />
                  </q-item-section>
                </q-item>
                <q-item dense>
                  <q-item-section>ORCID</q-item-section>
                  <q-item-section avatar><q-icon :name="getIcon(contact.orcid)" :color="getColor(contact.orcid)" />
                  </q-item-section></q-item>
              </li>
            </ol>
          </q-expansion-item>

          <q-expansion-item label="Hints" class="q-mt-md">
            <ul class="q-mt-md">
              <li v-for="(msg, i) in validateData.isaInvestigation.messages" :key="i" class="text-caption">
                {{ msg }}
              </li>
            </ul>
          </q-expansion-item>
        </div>
      </q-carousel-slide>
    </q-carousel>
  </q-dialog>
</template>
